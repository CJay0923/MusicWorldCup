// functions/api/singer/[mid].js
//
// GET /api/singer/:mid
//
// 从 D1 关系表（singers / singer_songs / singer_album_descriptions）重组出与
// src/data/singerData/{mid}.json 同构的 raw JSON，直接喂给前端的 transformToSingerData。
//
// 设计要点：
//  - 不存整包 JSON（D1 单语句 100KB 限制），改为运行时从关系表重组。
//  - singer_songs 按 ord 保序重组 entrants，确保对阵树 L/R 分组与历史部署一致。
//  - 缓存：CDN 边缘缓存 1h（歌手数据极少变动），降低 D1 读配额消耗。
//  - DB 未绑 → 503 {error:'db_unbound'}，前端自动回退本地/静态数据。
//  - 404 not_found：歌手不存在（mid 拼写错误或尚未迁移）。

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

  try {
    const singer = await env.DB.prepare(
      'SELECT name, photo, data_source, preprocessed FROM singers WHERE singer_mid = ?',
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
              itunes_track_id, pic, migu_preview_url
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

    const entrants = (songs.results || []).map((s) => ({
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

    const raw = {
      singerName: singer.name,
      singerPhoto: singer.photo || '',
      source: singer.data_source || 'kugou',
      preprocessed: singer.preprocessed === 1,
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
