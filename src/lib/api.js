// src/lib/api.js — 前端 API 客户端（精简版）
// 歌曲数据已预取到本地 JSON，此处仅保留音频 URL 获取
// 部署在 Cloudflare Pages 上时优先走后端代理（/api/qq/song-url/:songmid）
// 纯静态环境回退到 JSONP 直连 QQ 音乐

import { checkBackend, markBackendUnavailable } from './backend.js';

let jsonpCounter = 0;

function jsonp(url, { timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const cbName = `__jsonp_cb_${++jsonpCounter}_${Date.now()}`;
    const script = document.createElement('script');
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, timeout);

    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };

    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}callback=${cbName}&format=jsonp`;
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP error'));
    };
    document.head.appendChild(script);
  });
}

// QQ 音乐播放 URL（JSONP 直连）
// 使用随机 guid 提高 purl 命中率；C400(M4A) 失败时尝试 M500(MP3)
function randomGuid() {
  return String(Math.floor(Math.random() * 1e10));
}

async function jsonpSongUrl(songmid) {
  const guid = randomGuid();
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
    const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=jsonp&data=${encodeURIComponent(dataParam)}`;
    try {
      const data = await jsonp(url);
      const sip = data?.req_1?.data?.sip?.[0] || '';
      const purl = data?.req_1?.data?.midurlinfo?.[0]?.purl || '';
      if (purl) {
        return { url: sip + purl, quality: fmt.quality };
      }
    } catch {
      /* try next format */
    }
  }
  return { url: '', quality: 'm4a' };
}

// ---------- 对外接口 ----------

export async function fetchQQSongUrl(songmid) {
  if (await checkBackend()) {
    try {
      const res = await fetch(`/api/qq/song-url/${songmid}`);
      if (res.ok) return await res.json();
    } catch {
      markBackendUnavailable();
    }
  }
  return jsonpSongUrl(songmid);
}
