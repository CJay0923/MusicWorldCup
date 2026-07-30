// functions/api/netease/song-url.js — 网易云音乐播放 URL 代理
// 前端: netease.js fetchNeteaseAudioUrl(nid) → GET /api/netease/song-url?nid=123

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const nid = url.searchParams.get('nid');
  if (!nid) {
    return new Response(JSON.stringify({ url: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiUrl = `https://music.163.com/api/song/enhance/player/url?ids=[${nid}]&br=320000`;
  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://music.163.com/' },
    });
    const data = await res.json();
    if (data?.data?.[0]?.url && data.data[0].code === 200) {
      return new Response(JSON.stringify({ url: data.data[0].url }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    /* ignore */
  }

  return new Response(JSON.stringify({ url: null }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
