// functions/api/qq/search.js — QQ 音乐歌手搜索代理
// 前端: qqMusic.js requestSearch(keyword) → GET /api/qq/search?w=keyword&n=20
//
// 契约：上游故障/超时/非 2xx → 返回 502，让前端降级链（JSONP/CORS 代理）生效。
//       合法空查询（无关键词）→ 200 空结构（不触发降级）。

const TIMEOUT_MS = 8000;

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('w') || '';
  const n = url.searchParams.get('n') || '20';

  if (!keyword) {
    return json({ data: { song: { list: [] } } });
  }

  const apiUrl = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?w=${encodeURIComponent(keyword)}&t=0&n=${n}&format=json`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com/' },
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
