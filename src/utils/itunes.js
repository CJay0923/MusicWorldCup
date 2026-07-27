// itunes.js
// iTunes Search API 工具 — 作为试听兜底数据源
// 无需密钥，浏览器直连，天然支持 CORS（带 JSONP 降级）
//
// 参考用户上传的 musiccup api.js 实现，简化为：按歌手+歌名搜索，
// 返回 previewUrl（30秒预览片段）。

const ITUNES_BASE = 'https://itunes.apple.com';
const PREVIEW_CACHE = new Map(); // 同一会话内重复搜索免走网络

// JSONP 降级：fetch 被 CORS/网络挡住时使用
let jsonpMode = false;
let cbSeq = 0;

function jsonp(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const cb = '__mcup_cb_' + (++cbSeq);
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, timeout);
    function cleanup() { clearTimeout(timer); delete window[cb]; script.remove(); }
    window[cb] = data => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('jsonp failed')); };
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.head.appendChild(script);
  });
}

async function get(url) {
  if (!jsonpMode) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      try {
        const response = await fetch(url, { signal: ctrl.signal });
        if (!response.ok) throw new Error('http ' + response.status);
        return await response.json();
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      jsonpMode = true;
    }
  }
  return jsonp(url);
}

// 简繁折叠：把繁体转成简体用于搜索（iTunes 中文区对简体词更稳定）
// 如果没有折叠表，就用 NFKC 归一化兜底
function foldST(s) {
  // 简单的 NFKC 归一化，没有完整繁简表也能工作
  return String(s).normalize('NFKC');
}

// 去括号注记后的纯净歌名，用于匹配
function baseKey(name) {
  let s = foldST(String(name).normalize('NFKC').toLowerCase());
  s = s.replace(/[(\[（【][^)\]）】]*[)\]）】]/g, ' ');
  s = s.split(/\s+[-–—]\s+/)[0];
  s = s.replace(/[\s''"""!！?？。，、·&+]/g, '');
  return s || String(name).toLowerCase();
}

// 展示用歌名：剥离括号注记
function displayName(name) {
  const s = String(name)
    .replace(/\s*[(\[（【][^)\]）】]*[)\]）】]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s || String(name).trim();
}

/**
 * 按歌手+歌名搜索 iTunes 试听预览 URL
 * @param {string} artistName - 歌手名
 * @param {string} songName - 歌名
 * @returns {Promise<{preview: string, art: string, album: string} | null>}
 */
export async function findITunesPreview(artistName, songName) {
  const cacheKey = artistName + '|' + songName;
  if (PREVIEW_CACHE.has(cacheKey)) return PREVIEW_CACHE.get(cacheKey);

  // 中文歌手搜 cn + tw 两个店（曲库互有缺口），其他搜 us
  const stores = /[\u4e00-\u9fff]/.test(artistName) ? ['cn', 'tw', 'us'] : ['us'];
  const nk = baseKey(songName);
  const af = foldST(String(artistName).normalize('NFKC').toLowerCase());

  let out = null;
  let anyOk = false;

  for (const store of stores) {
    if (out) break;
    try {
      const term = foldST(artistName + ' ' + songName);
      const url = `${ITUNES_BASE}/search?term=${encodeURIComponent(term)}&entity=song&limit=12&country=${store}`;
      const r = await get(url);
      anyOk = true;

      const list = (r.results || []).filter(x => x.kind === 'song' && x.previewUrl);

      // 优先精确匹配（歌名 + 歌手名都对上）
      const exact = list.find(x =>
        baseKey(x.trackName) === nk &&
        foldST(String(x.artistName).normalize('NFKC').toLowerCase()) === af
      );
      // 退而求其次：只匹配歌名
      const byName = list.find(x => baseKey(x.trackName) === nk);
      // 再退：取第一条有预览的
      const first = list[0];

      const hit = exact || byName || first;
      if (hit) {
        out = {
          preview: hit.previewUrl,
          art: hit.artworkUrl100 || '',
          album: hit.collectionName || '',
        };
      }
    } catch (e) {
      // 换下一个商店
    }
  }

  // 全部请求失败则不缓存，网络恢复后可重试
  if (out || anyOk) PREVIEW_CACHE.set(cacheKey, out);
  return out;
}
