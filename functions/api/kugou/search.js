// functions/api/kugou/search.js — 酷狗歌曲搜索代理（热度）
// 前端: GET /api/kugou/search?s=<歌手名>+<歌名>&n=5
// 返回: { status, data: { lists: [{ SongName, SingerName, OwnerCount, HeatLevel, PublishDate }] } }
// 酷狗 song_search_v2 的 OwnerCount 是真实热度（不封顶），用于动态歌手搜索结果的种子排位。
//
// 契约：上游故障/超时/非 2xx → 502（触发前端 CORS 代理降级）；合法空查询 → 200 空结构。

const TIMEOUT_MS = 8000;

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const s = (url.searchParams.get('s') || '').trim();
  const n = url.searchParams.get('n') || '5';

  if (!s) {
    return json({ status: 0, data: { lists: [] } });
  }

  const apiUrl =
    `https://songsearch.kugou.com/song_search_v2?keyword=${encodeURIComponent(s)}` +
    `&page=1&pagesize=${n}&platform=Android&userid=-1&clientver=2000` +
    `&tag=em&filter=2&iscorrection=1&privilege_filter=0`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.kugou.com/',
      },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    return json(data);
  } catch {
    return json({ error: 'upstream_unavailable' }, 502);
  } finally {
    clearTimeout(timer);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
