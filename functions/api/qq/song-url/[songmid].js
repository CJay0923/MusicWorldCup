// functions/api/qq/song-url/[songmid].js — QQ 音乐歌曲播放 URL 代理
// 服务器端 fetch 直连 QQ 音乐，无 CORS 限制
// 前端: api.js fetchQQSongUrl(songmid) → GET /api/qq/song-url/:songmid
//
// 契约：上游故障/超时 → 502（触发前端 JSONP 降级）；上游正常但无 purl → 200 {url:''}（前端换源）。

const TIMEOUT_MS = 8000;

export async function onRequestGet({ params }) {
  const { songmid } = params;
  if (!songmid) {
    return json({ url: '', quality: 'm4a' });
  }

  const guid = String(Math.floor(Math.random() * 1e10));
  const formats = [
    { filename: `C400${songmid}.m4a`, quality: 'm4a' },
    { filename: `M500${songmid}.mp3`, quality: 'mp3' },
  ];

  let upstreamFailed = false;
  for (const fmt of formats) {
    const dataParam = JSON.stringify({
      comm: { ct: 24, cv: 0, uin: '0', format: 'json', platform: '20' },
      req_1: {
        module: 'vkey.GetVkeyServer',
        method: 'CgiGetVkey',
        param: {
          filename: [fmt.filename],
          guid,
          songmid: [songmid],
          songtype: [0],
          uin: '0',
          loginflag: 1,
          platform: '20',
        },
      },
    });
    const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?data=${encodeURIComponent(dataParam)}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com/' },
      });
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const data = await res.json();
      const sip = data?.req_1?.data?.sip?.[0] || '';
      const purl = data?.req_1?.data?.midurlinfo?.[0]?.purl || '';
      if (purl) {
        return json({ url: sip + purl, quality: fmt.quality });
      }
      // purl 为空 = 该格式无可用 URL，尝试下一个格式
    } catch {
      upstreamFailed = true;
      // 尝试下一个格式
    } finally {
      clearTimeout(timer);
    }
  }

  // 所有格式都无 purl：若曾发生上游错误 → 502 触发降级；否则 200 空（歌曲本身无可用 URL）
  if (upstreamFailed) {
    return json({ error: 'upstream_unavailable' }, 502);
  }
  return json({ url: '', quality: 'm4a' });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
