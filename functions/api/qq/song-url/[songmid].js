// functions/api/qq/song-url/[songmid].js — QQ 音乐歌曲播放 URL 代理
// 服务器端 fetch 直连 QQ 音乐，无 CORS 限制
// 前端: api.js fetchQQSongUrl(songmid) → GET /api/qq/song-url/:songmid

export async function onRequestGet({ params }) {
  const { songmid } = params;
  if (!songmid) {
    return new Response(JSON.stringify({ url: '', quality: 'm4a' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const guid = String(Math.floor(Math.random() * 1e10));
  const formats = [
    { filename: `C400${songmid}.m4a`, quality: 'm4a' },
    { filename: `M500${songmid}.mp3`, quality: 'mp3' },
  ];

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
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com/' },
      });
      const data = await res.json();
      const sip = data?.req_1?.data?.sip?.[0] || '';
      const purl = data?.req_1?.data?.midurlinfo?.[0]?.purl || '';
      if (purl) {
        return new Response(
          JSON.stringify({ url: sip + purl, quality: fmt.quality }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
    } catch {
      /* try next format */
    }
  }

  return new Response(JSON.stringify({ url: '', quality: 'm4a' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
