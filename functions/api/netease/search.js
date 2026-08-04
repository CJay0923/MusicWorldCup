// functions/api/netease/search.js — 网易云音乐搜索代理
// 前端: nidMatcher.js neteaseSearch(keyword) → GET /api/netease/search?s=keyword
//
// 契约：上游故障/超时/非 2xx → 502（触发前端 CORS 代理降级）；合法空查询 → 200 空结构。

const TIMEOUT_MS = 8000;

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('s') || '';
  if (!keyword) {
    return json({ result: { songs: [] } });
  }

  const apiUrl = `https://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=5`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://music.163.com/' },
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
