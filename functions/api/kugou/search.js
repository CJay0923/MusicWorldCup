// functions/api/kugou/search.js — 酷狗歌曲搜索代理（热度）
// 前端: GET /api/kugou/search?s=<歌手名>+<歌名>&n=5
// 返回: { status, data: { lists: [{ SongName, SingerName, OwnerCount, HeatLevel, PublishDate }] } }
// 酷狗 song_search_v2 的 OwnerCount 是真实热度（不封顶，如晴天 314 万 vs 双刀 5 万），
// 用于动态歌手搜索结果的种子排位（补充 QQ favCount 封顶问题）。

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const s = (url.searchParams.get('s') || '').trim();
  const n = url.searchParams.get('n') || '5';

  if (!s) {
    return new Response(JSON.stringify({ status: 0, data: { lists: [] } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiUrl =
    `https://songsearch.kugou.com/song_search_v2?keyword=${encodeURIComponent(s)}` +
    `&page=1&pagesize=${n}&platform=Android&userid=-1&clientver=2000` +
    `&tag=em&filter=2&iscorrection=1&privilege_filter=0`;
  try {
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.kugou.com/',
      },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ status: 0, data: { lists: [] } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
