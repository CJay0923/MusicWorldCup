// src/utils/netease.js — 网易云音乐音频源工具
// 作为试听降级源：当 iTunes 无预览、QQ 音乐无流媒体时，尝试从网易云获取播放 URL
//
// 部署在 Cloudflare Pages 上时优先走后端代理（/api/netease/song-url）
// 纯静态环境回退到 JSONP + CORS 代理
//
// 注意：周杰伦等歌手在网易云无版权，此函数会返回空 URL，自然降级到搜索页

import { matchNid } from './nidMatcher.js';
import { checkBackend, markBackendUnavailable } from '../lib/backend.js';

const NETEASE_URL_CACHE_PREFIX = 'netease_url_';
const NETEASE_URL_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

let jsonpCounter = 0;

/**
 * 通过 JSONP 获取网易云歌曲播放 URL
 * 使用 music.163.com 的公开 API（浏览器端可用，无 CORS 限制）
 * @param {number} nid - 网易云歌曲 ID
 * @returns {Promise<string|null>} 播放 URL 或 null
 */
function fetchNeteaseUrlJSONP(nid) {
  return new Promise((resolve) => {
    const cbName = '__ne_url_cb_' + (++jsonpCounter) + '_' + Date.now();
    // 使用 song/enhance/player/url 接口获取播放 URL
    const url = `https://music.163.com/api/song/enhance/player/url?ids=[${nid}]&br=320000&callback=${cbName}`;

    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      try { delete window[cbName]; } catch { window[cbName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(null);
      }
    }, 8000);

    window[cbName] = (data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();

      // 接口返回: { data: [{ url: "...", code: 200 }] }
      if (data?.data?.[0]?.url && data.data[0].code === 200) {
        resolve(data.data[0].url);
      } else {
        resolve(null);
      }
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };

    script.src = url;
    document.head.appendChild(script);
  });
}

/**
 * 通过 CORS 代理获取网易云歌曲播放 URL（JSONP 失败时的降级）
 * @param {number} nid - 网易云歌曲 ID
 * @returns {Promise<string|null>}
 */
async function fetchNeteaseUrlProxy(nid) {
  const apiUrl = `https://music.163.com/api/song/enhance/player/url?ids=[${nid}]&br=320000`;
  const proxies = [
    (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];

  for (const makeProxy of proxies) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(makeProxy(apiUrl), { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.[0]?.url && data.data[0].code === 200) {
          return data.data[0].url;
        }
      }
    } catch {
      // 换下一个代理
    }
  }
  return null;
}

/**
 * 获取网易云播放 URL（主调入口）
 * 先查 localStorage 缓存，再后端代理 → JSONP → CORS 代理降级
 * @param {number} nid - 网易云歌曲 ID
 * @returns {Promise<string|null>} 播放 URL 或 null
 */
export async function fetchNeteaseAudioUrl(nid) {
  if (!nid) return null;

  // 查缓存
  const cacheKey = NETEASE_URL_CACHE_PREFIX + nid;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < NETEASE_URL_CACHE_TTL) {
        return parsed.url;
      }
    }
  } catch { /* ignore */ }

  // 策略 0: 后端代理（Cloudflare Pages Functions）
  let url = null;
  if (await checkBackend()) {
    try {
      const res = await fetch(`/api/netease/song-url?nid=${nid}`);
      if (res.ok) {
        const data = await res.json();
        url = data.url || null;
      }
    } catch {
      markBackendUnavailable();
    }
  }

  // 策略 1: JSONP
  if (!url) {
    url = await fetchNeteaseUrlJSONP(nid);
  }

  // 策略 2: CORS 代理
  if (!url) {
    url = await fetchNeteaseUrlProxy(nid);
  }

  // 缓存结果（包括 null，避免重复请求无版权歌曲）
  if (url !== null) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ url, ts: Date.now() }));
    } catch { /* ignore */ }
  }

  return url;
}

/**
 * 获取网易云播放 URL（完整流程：搜索 nid → 获取 URL）
 * 用于 useAudioPlayer 的降级链
 * @param {string} songName - 歌名
 * @param {string} artistName - 歌手名
 * @param {number|null} knownNid - 已知的 nid（预取数据中可能有），避免重复搜索
 * @returns {Promise<string|null>} 播放 URL 或 null
 */
export async function getNeteasePreviewUrl(songName, artistName, knownNid = null) {
  // 优先使用已知 nid
  const nid = knownNid || await matchNid(songName, artistName);
  if (!nid) return null;

  return fetchNeteaseAudioUrl(nid);
}
