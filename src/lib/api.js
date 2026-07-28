// src/lib/api.js — 前端 API 客户端（精简版）
// 歌曲数据已预取到本地 JSON，此处仅保留音频 URL 获取（JSONP 直连 QQ 音乐）
// 无需后端，纯前端 JSONP 绕过 CORS

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

// QQ 音乐播放 URL（JSONP 直连，通常返回空 purl，需依赖网易云/iTunes 回退）
async function jsonpSongUrl(songmid) {
  const dataParam = JSON.stringify({
    comm: { ct: 24, cv: 0, uin: '0', format: 'json', platform: '20' },
    req_1: {
      module: 'vkey.GetVkeyServer',
      method: 'CgiGetVkey',
      param: {
        filename: [`C400${songmid}.m4a`],
        guid: '10000',
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
    return { url: purl ? sip + purl : '', quality: 'm4a' };
  } catch {
    return { url: '', quality: 'm4a' };
  }
}

// 检测后端是否可用（如有后端代理则优先使用）
let backendAvailable = null;
async function checkBackend() {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    await fetch('/api/health', { signal: ctrl.signal });
    clearTimeout(timer);
    backendAvailable = true;
  } catch {
    backendAvailable = false;
  }
  return backendAvailable;
}

// ---------- 对外接口 ----------

export async function fetchQQSongUrl(songmid) {
  if (await checkBackend()) {
    try {
      const res = await fetch(`/api/qq/song-url/${songmid}`);
      if (res.ok) return await res.json();
    } catch {
      backendAvailable = false;
    }
  }
  return jsonpSongUrl(songmid);
}
