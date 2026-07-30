// src/lib/qqMusic.js — 前端 QQ Music API 客户端
// 部署在 Cloudflare Pages 上时优先走后端代理（/api/qq/search, /api/qq/musicu）
// 纯静态环境回退到 JSONP + CORS 代理
//
// API 端点：
//   1. 歌手搜索: client_search_cp (t=0 歌曲搜索，从结果提取歌手信息)
//   2. 歌曲列表: musicu.fcg + music.web_singer_info_svr
//   3. 专辑详情: musicu.fcg + music.album.AlbumInfoServer
//
// 策略优先级：
//   0. 后端代理（Cloudflare Pages Functions，同域无 CORS）
//   1. JSONP（直连，最快）
//   2. CORS 代理 + fetch（fallback）

import { checkBackend, markBackendUnavailable } from './backend.js';

let jsonpCounter = 0;

// ---------- CORS 代理列表（fallback 用）----------
const CORS_PROXIES = [
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

/**
 * CORS 代理 fetch（format=json，返回纯 JSON）
 */
async function fetchWithProxy(jsonUrl, timeout = 10000) {
  // 先试直连 fetch（未来若 QQ 音乐加 CORS 头可直连）
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(jsonUrl, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) return await res.json();
  } catch {}

  // 依次尝试 CORS 代理
  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(jsonUrl);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      const res = await fetch(proxyUrl, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) return await res.json();
    } catch {}
  }

  throw new Error('All CORS proxies failed');
}

/**
 * 通用 JSONP 请求
 * @param {string} url - 请求 URL
 * @param {object} opts
 * @param {number} opts.timeout - 超时毫秒
 * @param {string} opts.fixedCallback - 固定回调名（client_search_cp 忽略 callback 参数）
 * @returns {Promise<any>}
 */
function jsonp(url, { timeout = 10000, fixedCallback = null } = {}) {
  return new Promise((resolve, reject) => {
    const cbName = `__qq_cb_${++jsonpCounter}_${Date.now()}`;
    const useFixed = !!fixedCallback;
    const windowKey = useFixed ? fixedCallback : cbName;

    // 保存已有的 window[windowKey]，请求完成后恢复
    const saved = window[windowKey];

    const script = document.createElement('script');
    let timer = null;
    let settled = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (saved !== undefined) {
        window[windowKey] = saved;
      } else {
        try {
          delete window[windowKey];
        } catch {}
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('JSONP timeout'));
      }
    }, timeout);

    window[windowKey] = (data) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(data);
    };

    const sep = url.includes('?') ? '&' : '?';
    if (useFixed) {
      // 固定回调名端点：不传 callback 参数，响应自动包裹在 callback(...) 中
      script.src = `${url}${sep}format=jsonp`;
    } else {
      script.src = `${url}${sep}format=jsonp&callback=${cbName}`;
    }
    script.onerror = () => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('JSONP error'));
      }
    };
    document.head.appendChild(script);
  });
}

// ---------- client_search_cp 串行化（避免 window.callback 竞态）----------
let fixedCallbackChain = Promise.resolve();

function jsonpFixedCallback(url, opts = {}) {
  // 串行化：等前一个 client_search_cp 请求完成后再发下一个
  const result = fixedCallbackChain.then(() =>
    jsonp(url, { ...opts, fixedCallback: 'callback' }),
  );
  // 无论成功失败，都释放链
  fixedCallbackChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

// ---------- 多策略请求：JSONP 优先，CORS 代理 fallback ----------

/**
 * 请求 client_search_cp（歌手搜索）
 * 策略 1: JSONP（window.callback，串行化）
 * 策略 2: CORS 代理 + fetch（format=json）
 */
async function requestSearch(keyword, n = 20) {
  // 策略 0: 后端代理（Cloudflare Pages Functions）
  if (await checkBackend()) {
    try {
      const res = await fetch(`/api/qq/search?w=${encodeURIComponent(keyword)}&n=${n}`);
      if (res.ok) return await res.json();
    } catch {
      markBackendUnavailable();
    }
  }

  const jsonpUrl = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?w=${encodeURIComponent(keyword)}&t=0&n=${n}&format=jsonp`;

  // 策略 1: JSONP
  try {
    return await jsonpFixedCallback(jsonpUrl, { timeout: 8000 });
  } catch (jsonpErr) {
    // 策略 2: CORS 代理
    const jsonUrl = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?w=${encodeURIComponent(keyword)}&t=0&n=${n}&format=json`;
    return await fetchWithProxy(jsonUrl);
  }
}

/**
 * 请求 musicu.fcg（歌曲列表 / 专辑详情）
 * 策略 1: JSONP（自定义回调名，无竞态）
 * 策略 2: CORS 代理 + fetch（format=json）
 */
async function requestMusicu(dataObj) {
  // 策略 0: 后端代理（Cloudflare Pages Functions）
  if (await checkBackend()) {
    try {
      const res = await fetch('/api/qq/musicu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataObj }),
      });
      if (res.ok) return await res.json();
    } catch {
      markBackendUnavailable();
    }
  }

  const dataStr = JSON.stringify(dataObj);
  const jsonpUrl = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=jsonp&data=${encodeURIComponent(dataStr)}`;

  // 策略 1: JSONP（自定义回调名，安全并发）
  try {
    return await jsonp(jsonpUrl, { timeout: 12000 });
  } catch (jsonpErr) {
    // 策略 2: CORS 代理
    const jsonUrl = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(dataStr)}`;
    return await fetchWithProxy(jsonUrl);
  }
}

// ==================== 导出 API ====================

/**
 * 搜索歌手：通过歌曲搜索 API 间接获取歌手信息
 * @param {string} keyword - 搜索关键词（歌手名）
 * @returns {Promise<Array<{name, mid, photo}>>}
 */
export async function searchSingers(keyword) {
  if (!keyword || !keyword.trim()) return [];
  try {
    const data = await requestSearch(keyword.trim(), 20);
    const songs = data?.data?.song?.list || [];
    // 从歌曲结果中提取去重的歌手信息
    const singerMap = new Map();
    for (const song of songs) {
      const singers = song.singer || [];
      for (const s of singers) {
        if (s.mid && !singerMap.has(s.mid)) {
          singerMap.set(s.mid, {
            name: s.name,
            mid: s.mid,
            photo: `https://y.gtimg.cn/music/photo_new/T001R300x300M000${s.mid}.jpg`,
          });
        }
      }
    }
    // 过滤：只返回与搜索关键词相关的歌手
    const kw = keyword.trim().toLowerCase();
    const results = Array.from(singerMap.values()).filter((s) => {
      const name = s.name.toLowerCase();
      return name.includes(kw) || kw.includes(name);
    });
    // 如果精确匹配失败，返回全部结果
    return results.length > 0 ? results : Array.from(singerMap.values());
  } catch {
    return [];
  }
}

/**
 * 获取歌手完整歌曲列表（分页拉取）
 * @param {string} singermid - QQ 音乐歌手 mid
 * @param {(progress: string) => void} onProgress - 进度回调
 * @returns {Promise<{songs: Array, singerName: string, singermid: string}>}
 */
export async function fetchSingerSongs(singermid, onProgress) {
  const allSongs = [];
  const perPage = 50;
  let page = 0;
  let totalSong = 0;
  let singerName = '';

  while (page < 30) {
    const dataObj = {
      comm: { ct: 24, cv: 0 },
      singer: {
        method: 'get_singer_detail_info',
        module: 'music.web_singer_info_svr',
        param: { sort: 5, singermid, sin: page * perPage, num: perPage },
      },
    };

    try {
      const data = await requestMusicu(dataObj);
      const songList = data?.singer?.data?.songlist || [];
      totalSong = data?.singer?.data?.total_song || totalSong;
      singerName = data?.singer?.data?.singer_info?.name || singerName;

      if (songList.length === 0) break;

      for (const item of songList) {
        const song = item.song || item;
        const name = (song.name || '').trim();
        const songmid = song.mid || '';
        const songid = song.id || 0;

        if (!name || !songmid) continue;

        const album = song.album || {};
        allSongs.push({
          name,
          songmid,
          songid,
          albumMid: album.mid || '',
          albumName: album.name || '',
          albumDate: album.time_public || '',
        });
      }

      if (onProgress) {
        onProgress(`已加载 ${allSongs.length}/${totalSong} 首`);
      }

      if (totalSong > 0 && allSongs.length >= totalSong) break;
      page++;
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      break;
    }
  }

  return { songs: allSongs, singerName, singermid };
}

/**
 * 获取专辑详情（类型、简介）
 * @param {string} albumMid
 * @returns {Promise<{mid, name, aDate, albumType, desc}>}
 */
export async function fetchAlbumDetail(albumMid) {
  const dataObj = {
    comm: { ct: 24, cv: 0 },
    req_1: {
      module: 'music.album.AlbumInfoServer',
      method: 'GetAlbumDetail',
      param: { albumMid },
    },
  };
  try {
    const data = await requestMusicu(dataObj);
    const info = data?.req_1?.data || {};
    return {
      mid: albumMid,
      name: info.albumName || '',
      aDate: info.publishDate || '',
      albumType: info.albumType || '',
      desc: info.albumDesc || info.desc || '',
    };
  } catch {
    return { mid: albumMid, name: '', aDate: '', albumType: '', desc: '' };
  }
}

/**
 * 批量拉取专辑详情
 * @param {string[]} albumMids - 专辑 mid 数组
 * @param {(done: number, total: number) => void} [onProgress] - 进度回调
 * @param {number} [concurrency=4] - 并发数
 * @returns {Promise<Map<string, {albumType, albumDesc}>>}
 */
export async function fetchAlbumDetailsBatch(albumMids, onProgress, concurrency = 4) {
  const result = new Map();
  const total = albumMids.length;
  let done = 0;
  let nextIdx = 0;

  const worker = async () => {
    while (true) {
      const i = nextIdx++;
      if (i >= total) break;
      const mid = albumMids[i];
      try {
        const detail = await fetchAlbumDetail(mid);
        result.set(mid, {
          albumType: detail.albumType || '',
          albumDesc: detail.desc || '',
        });
      } catch {
        // 忽略单张专辑失败
      }
      done++;
      if (onProgress) onProgress(done, total);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker()),
  );
  return result;
}

/**
 * 批量拉取歌曲收藏量
 * 使用 QQ Music musicu.fcg 接口查询歌曲信息
 * @param {number[]} songIds - 歌曲 ID 数组
 * @returns {Promise<Object<string, number>>} songId -> favCount 映射
 */
export async function fetchSongFavCounts(songIds) {
  if (!songIds || songIds.length === 0) return {};

  const result = {};
  const BATCH_SIZE = 30;

  for (let i = 0; i < songIds.length; i += BATCH_SIZE) {
    const batch = songIds.slice(i, i + BATCH_SIZE);
    const dataObj = {
      comm: { ct: 24, cv: 0 },
      req_1: {
        module: 'music.personginfo.QuerySongInfo',
        method: 'QuerySongInfo',
        param: {
          songIds: batch,
          songType: 0,
        },
      },
    };
    try {
      const data = await requestMusicu(dataObj);
      const songs = data?.req_1?.data?.songs || [];
      for (const song of songs) {
        const id = song.id || song.songid;
        if (id) {
          result[id] = song.favCount || song.fav || 0;
        }
      }
    } catch {
      // 忽略批量失败
    }
  }
  return result;
}
