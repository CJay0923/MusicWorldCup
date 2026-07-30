// functions/api/qq/musicu.js — QQ 音乐 musicu.fcg 通用代理
// 前端: qqMusic.js requestMusicu(dataObj) → POST /api/qq/musicu  body={data: {...}}
// 覆盖: 歌手歌曲列表、专辑详情、歌曲收藏量等所有 musicu.fcg 调用

export async function onRequestPost({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const dataObj = body?.data;
  if (!dataObj) {
    return new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const dataStr = JSON.stringify(dataObj);
  const apiUrl = `https://u.y.qq.com/cgi-bin/musicu.fcg?data=${encodeURIComponent(dataStr)}`;
  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com/' },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
