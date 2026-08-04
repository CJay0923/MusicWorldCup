// functions/api/netease/song-url.js — 网易云音乐播放 URL 代理
// 前端: netease.js fetchNeteaseAudioUrl(nid) → GET /api/netease/song-url?nid=123
//
// 契约：上游故障/超时/非 2xx → 502（触发前端降级）；上游正常但无可用 URL → 200 {url:null}（前端换源）。

const TIMEOUT_MS = 8000;

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const nid = url.searchParams.get('nid');
  if (!nid) {
    return json({ url: null }, 400);
  }

  const apiUrl = `https://music.163.com/api/song/enhance/player/url?ids=[${nid}]&br=320000`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://music.163.com/' },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    if (data?.data?.[0]?.url && data.data[0].code === 200) {
      return json({ url: data.data[0].url });
    }
    // 上游有响应但无可用 URL → 200 空（前端换源），不降级
    return json({ url: null });
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
