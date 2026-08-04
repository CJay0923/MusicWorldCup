// functions/api/qq/musicu.js — QQ 音乐 musicu.fcg 通用代理
// 前端: qqMusic.js requestMusicu(dataObj) → POST /api/qq/musicu  body={data: {...}}
// 覆盖: 歌手歌曲列表、专辑详情、歌曲收藏量等所有 musicu.fcg 调用
//
// 契约：上游故障/超时/非 2xx → 502（触发前端降级）；坏 body → 400。

const TIMEOUT_MS = 8000;

export async function onRequestPost({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const dataObj = body?.data;
  if (!dataObj) {
    return json({ error: 'bad_request' }, 400);
  }

  const dataStr = JSON.stringify(dataObj);
  const apiUrl = `https://u.y.qq.com/cgi-bin/musicu.fcg?data=${encodeURIComponent(dataStr)}`;
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
