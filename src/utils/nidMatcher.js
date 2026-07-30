// src/utils/nidMatcher.js — 网易云 nid 懒加载匹配
// 播放时按需调用，不阻塞歌曲列表加载
// 部署在 Cloudflare Pages 上时优先走后端代理（/api/netease/search）
// 纯静态环境回退到 JSONP + CORS 代理

import { checkBackend, markBackendUnavailable } from '../lib/backend.js';

const NID_CACHE_PREFIX = 'nid_';
const NID_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * 规范化歌名用于匹配（去括号内容、去空格、转小写）
 */
function normalizeName(name) {
  if (!name) return '';
  let s = name.replace(/[（(].*?[)）]/g, '');
  s = s.replace(/[【\[].*?[\]】]/g, '');
  s = s.replace(/[（(）)]/g, '');
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * 通过后端代理调用网易云搜索 API
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<object|null>}
 */
async function neteaseSearchBackend(keyword) {
  if (!(await checkBackend())) return null;
  try {
    const res = await fetch(`/api/netease/search?s=${encodeURIComponent(keyword)}`);
    if (res.ok) return await res.json();
  } catch {
    markBackendUnavailable();
  }
  return null;
}

/**
 * 通过 JSONP 调用网易云搜索 API（浏览器端可用，无 CORS 限制）
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<object|null>}
 */
function neteaseSearchJSONP(keyword) {
  return new Promise((resolve) => {
    const cbName = '__netease_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const url = `https://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=5&callback=${cbName}`;

    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      delete window[cbName];
      script.remove();
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
      resolve(data);
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
 * 通过 CORS 代理调用网易云搜索 API（JSONP 失败时的降级方案）
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<object|null>}
 */
async function neteaseSearchProxy(keyword) {
  const apiUrl = `https://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=5`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;

  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * 匹配网易云 nid (用于音频播放回退)
 * 预取数据中已有 nid 时不会调用此函数；仅在 nid 缺失时运行时匹配
 * @param {string} songName - 歌名
 * @param {string} artistName - 歌手名
 * @returns {Promise<number|null>}
 */
export async function matchNid(songName, artistName) {
  const normName = normalizeName(songName);
  const cacheKey = NID_CACHE_PREFIX + artistName + '_' + normName;

  // Check localStorage cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < NID_CACHE_TTL) {
        return parsed.nid;
      }
    }
  } catch {
    /* ignore parse errors */
  }

  const keyword = `${artistName} ${songName}`;

  // 策略 0: 后端代理（Cloudflare Pages Functions）
  let data = await neteaseSearchBackend(keyword);

  // 策略 1: JSONP（最可靠，无 CORS 限制）
  if (!data) {
    data = await neteaseSearchJSONP(keyword);
  }

  // 策略 2: CORS 代理降级
  if (!data) {
    data = await neteaseSearchProxy(keyword);
  }

  if (!data || !data.result || !data.result.songs) return null;

  const songs = data.result.songs;

  // 精确匹配：艺术家包含歌手名
  for (const s of songs) {
    const artists = (s.artists || []).map((a) => a.name).join(' ');
    if (artists.includes(artistName)) {
      const nid = s.id;
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ nid, ts: Date.now() }));
      } catch {
        /* localStorage full or unavailable */
      }
      return nid;
    }
  }

  // 降级：取第一个结果
  const nid = songs[0]?.id || null;
  if (nid) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ nid, ts: Date.now() }));
    } catch {
      /* localStorage full or unavailable */
    }
  }

  return nid;
}
