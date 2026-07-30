// functions/api/qq/search.js — QQ 音乐歌手搜索代理
// 前端: qqMusic.js requestSearch(keyword) → GET /api/qq/search?w=keyword&n=20

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('w') || '';
  const n = url.searchParams.get('n') || '20';

  if (!keyword) {
    return new Response(JSON.stringify({ data: { song: { list: [] } } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiUrl = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?w=${encodeURIComponent(keyword)}&t=0&n=${n}&format=json`;
  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com/' },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ data: { song: { list: [] } } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
