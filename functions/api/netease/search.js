// functions/api/netease/search.js — 网易云音乐搜索代理
// 前端: nidMatcher.js neteaseSearch(keyword) → GET /api/netease/search?s=keyword

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('s') || '';
  if (!keyword) {
    return new Response(JSON.stringify({ result: { songs: [] } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiUrl = `https://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=5`;
  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://music.163.com/' },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ result: { songs: [] } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
