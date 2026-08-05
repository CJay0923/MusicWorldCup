// functions/api/singers/batch.js
//
// GET /api/singers/batch?mids=a,b,c&[filter=1]&[dedupe=1]&[minFav=20000]&[limit=0]
//
// 跨歌手对阵一次性拉取多位预注册歌手，把单接口 N 次调用 + 3N 次 D1 读
// 塌缩为 1 次调用 + 3 条 IN 子句查询。返回 { singers: { [mid]: raw } }，
// 每位 raw 的结构与单接口 /api/singer/[mid] 完全一致（已服务端过滤 + preprocessed）。
//
// 设计要点：
//  - 3 条 IN 查询：singers / singer_songs / singer_album_descriptions，按 singer_mid 分组重组。
//  - 筛选规则来自 _shared/server-filter（与单接口、前端共用），修改一处全链路生效。
//  - 缓存：整组以 URL（含 mids 列表）为键边缘缓存 1h（不同歌手组合天然形成不同缓存键）。
//  - DB 未绑 → 503 {error:'db_unbound'}，前端自动回退逐位加载。
//  - 单个歌手不存在时不在 singers  map 中出现，前端对该 mid 走单接口 + jsDelivr 兜底。

import { applyServerFilter } from '../../_shared/server-filter.mjs';

const SINGER_MID_RE = /[^a-zA-Z0-9_-]/g;
const MAX_MIDS = 128;

export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'db_unbound' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const mids = (url.searchParams.get('mids') || '')
    .split(',')
    .map((m) => decodeURIComponent(m.trim()).replace(SINGER_MID_RE, ''))
    .filter(Boolean)
    .slice(0, MAX_MIDS);

  if (mids.length === 0) {
    return new Response(JSON.stringify({ error: 'bad_mids' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const doFilter = url.searchParams.get('filter') !== '0';
  const dedupe = url.searchParams.get('dedupe') !== '0';
  const minFavParam = Number(url.searchParams.get('minFav'));
  const minFav = Number.isFinite(minFavParam) && minFavParam > 0 ? minFavParam : undefined;
  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 0;

  const placeholders = mids.map(() => '?').join(',');

  try {
    const singerRows = await env.DB.prepare(
      `SELECT singer_mid, name, photo, data_source, preprocessed
         FROM singers WHERE singer_mid IN (${placeholders})`,
    )
      .bind(...mids)
      .all();

    const songRows = await env.DB.prepare(
      `SELECT singer_mid, ord, song_mid, song_id, name, album_mid, album_name,
              album_date, album_type, fav_count, seed_rank, itunes_preview_url,
              itunes_track_url, itunes_track_id, pic, migu_preview_url
         FROM singer_songs WHERE singer_mid IN (${placeholders}) ORDER BY ord ASC`,
    )
      .bind(...mids)
      .all();

    const descRows = await env.DB.prepare(
      `SELECT singer_mid, album_mid, description
         FROM singer_album_descriptions WHERE singer_mid IN (${placeholders})`,
    )
      .bind(...mids)
      .all();

    // 按歌手分组
    const songsBySinger = {};
    for (const s of songRows.results || []) {
      (songsBySinger[s.singer_mid] ||= []).push(s);
    }
    const descsBySinger = {};
    for (const d of descRows.results || []) {
      (descsBySinger[d.singer_mid] ||= {})[d.album_mid] = d.description;
    }

    const singers = {};
    for (const row of singerRows.results || []) {
      const mid = row.singer_mid;
      const rawSongs = (songsBySinger[mid] || []).map((s) => ({
        name: s.name,
        songmid: s.song_mid,
        songid: s.song_id,
        pic: s.pic || '',
        albumMid: s.album_mid || '',
        albumName: s.album_name || '',
        albumDate: s.album_date || '',
        albumType: s.album_type || '',
        favCount: s.fav_count || 0,
        seedRank: s.seed_rank || 0,
        itunesPreviewUrl: s.itunes_preview_url || '',
        itunesTrackUrl: s.itunes_track_url || '',
        itunesTrackId: s.itunes_track_id ?? null,
        miguPreviewUrl: s.migu_preview_url || '',
      }));

      let entrants = rawSongs;
      let preprocessed = row.preprocessed === 1;
      if (doFilter) {
        entrants = applyServerFilter(rawSongs, {
          dedupe,
          minFav,
          limit,
        });
        preprocessed = true;
      }

      singers[mid] = {
        singerName: row.name,
        singerPhoto: row.photo || '',
        source: row.data_source || 'kugou',
        preprocessed,
        albumDescs: descsBySinger[mid] || {},
        entrants,
      };
    }

    return new Response(JSON.stringify({ singers }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'db_error', detail: String(err).slice(0, 200) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
