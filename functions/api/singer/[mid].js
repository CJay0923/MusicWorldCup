// functions/api/singer/[mid].js
//
// GET /api/singer/:mid?[filter=1]&[dedupe=1]&[minFav=20000]
//
// 从 D1 关系表（singers / singer_songs / singer_album_descriptions）重组出与
// src/data/singerData/{mid}.json 同构的 raw JSON，并（默认）在服务端完成
// Live/伴奏/串烧过滤 + baseKey 去重 + 收藏量排序，直接返回「已预处理」的数据，
// 前端仅做字段映射，无需再跑正则。
//
// 设计要点：
//  - 不存整包 JSON（D1 单语句 100KB 限制），改为运行时从关系表重组。
//  - 筛选规则来自 functions/_shared（与前端共用），修改一处全链路生效。
//  - 缓存：CDN 边缘缓存 1h（过滤结果确定性高），降低 D1 读配额消耗。
//         不同 filter/minFav 组合天然形成不同缓存键（URL 含 query），互不串扰。
//  - DB 未绑 → 503 {error:'db_unbound'}，前端自动回退本地/静态数据。
//  - 404 not_found：歌手不存在（mid 拼写错误或尚未迁移）。
//  - filter=0 返回未过滤 raw（排障/兼容旧前端慢路径）。

import { applyServerFilter } from '../../_shared/server-filter.mjs';
import { MIN_FAV_LOOSE } from '../../_shared/filters.mjs';

const SINGER_MID_RE = /[^a-zA-Z0-9_-]/g;

export async function onRequestGet({ request, env, params }) {
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'db_unbound' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const mid = decodeURIComponent(params.mid || '').replace(SINGER_MID_RE, '');
  if (!mid) {
    return new Response(JSON.stringify({ error: 'bad_mid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 可选查询参数
  const url = new URL(request.url);
  const doFilter = url.searchParams.get('filter') !== '0';
  const dedupe = url.searchParams.get('dedupe') !== '0';
  const minFavParam = Number(url.searchParams.get('minFav'));
  const minFav = Number.isFinite(minFavParam) && minFavParam > 0 ? minFavParam : MIN_FAV_LOOSE;

  try {
    const singer = await env.DB.prepare(
      'SELECT name, photo, bio, data_source, preprocessed FROM singers WHERE singer_mid = ?',
    )
      .bind(mid)
      .first();

    if (!singer) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const songs = await env.DB.prepare(
      `SELECT ord, song_mid, song_id, name, album_mid, album_name, album_date,
              album_type, fav_count, seed_rank, itunes_preview_url, itunes_track_url,
              itunes_track_id, pic, migu_preview_url, is_representative
         FROM singer_songs
        WHERE singer_mid = ?
        ORDER BY ord ASC`,
    )
      .bind(mid)
      .all();

    const descs = await env.DB.prepare(
      'SELECT album_mid, description FROM singer_album_descriptions WHERE singer_mid = ?',
    )
      .bind(mid)
      .all();

    const albumDescs = {};
    for (const d of descs.results || []) {
      albumDescs[d.album_mid] = d.description;
    }

    let entrants = (songs.results || []).map((s) => ({
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
      representative: s.is_representative === 1,
    }));

    // 服务端筛选（默认开启）：过滤 + 去重 + 排序后强制 preprocessed=true，
    // 前端走快路径仅做字段映射，无需再跑正则。
    let preprocessed = singer.preprocessed === 1;
    if (doFilter) {
      entrants = applyServerFilter(entrants, { dedupe, minFav });
      preprocessed = true;
    }

    const raw = {
      singerName: singer.name,
      singerPhoto: singer.photo || '',
      bio: singer.bio || '',
      source: singer.data_source || 'kugou',
      preprocessed,
      albumDescs,
      entrants,
    };

    return new Response(JSON.stringify(raw), {
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
