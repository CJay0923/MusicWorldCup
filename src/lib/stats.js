// 全站投票统计客户端
//
// 铁律: 上报永远是 fire-and-forget。任何网络异常都不得影响冠军页的展示。
// 因此所有函数都自行吞掉异常，调用方无需 try/catch，也不必 await。

const DEVICE_KEY = 'mwc:deviceId';
const SENT_KEY = 'mwc:sentSessions';

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** 匿名设备标识，仅用于去重与云端存档，不含任何个人信息 */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** 条目稳定标识: 优先 mid，缺失时回退到归一化名称，保证不同来源聚合到同一行 */
function midOf(e) {
  if (!e) return null;
  if (e.type === 'album') return e.albumMid || (e.name ? 'n:' + norm(e.name) : null);
  if (e.type === 'singer') return e.id || (e.name ? 'n:' + norm(e.name) : null);
  return e.songmid || (e.name ? 'n:' + norm(e.name) : null);
}

function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[（(].*?[)）]/g, '')
    .slice(0, 60);
}

function toItem(e) {
  const mid = midOf(e);
  if (!mid) return null;
  return {
    mid,
    type: e.type || 'song',
    title: e.name || null,
    subtitle: e.singerName || null,
  };
}

/** 本地去重: 同一 session 只提交一次，避免刷新冠军页反复上报 */
function alreadySent(sessionId) {
  try {
    const raw = JSON.parse(localStorage.getItem(SENT_KEY) || '[]');
    if (raw.includes(sessionId)) return true;
    raw.push(sessionId);
    localStorage.setItem(SENT_KEY, JSON.stringify(raw.slice(-50)));
    return false;
  } catch {
    return false;
  }
}

/**
 * 赛后一次性上报整场结果。
 *
 * @param {object}   opts
 * @param {string}   opts.scope     singerId 或 cross:xxx
 * @param {string}   opts.mode      classic | worldcup | custom | ranking | cross
 * @param {number}   opts.size      参赛规模
 * @param {Array}    opts.history   useGameState 的 history，元素为 { winner, loser }
 * @param {object}   opts.champion  冠军条目
 * @param {string}  [opts.sessionId] 幂等键，不传则自动生成
 */
export function reportResult({ scope, mode, size, history, champion, sessionId }) {
  try {
    if (!scope || !Array.isArray(history) || history.length === 0) return;

    const sid = sessionId || uuid();
    if (alreadySent(sid)) return;

    const matches = [];
    for (const h of history) {
      const w = toItem(h.winner);
      const l = toItem(h.loser);
      if (w && l) matches.push({ winner: w, loser: l });
    }
    if (matches.length === 0) return;

    const body = JSON.stringify({
      sessionId: sid,
      scope,
      mode: mode || 'classic',
      size: size || null,
      deviceId: getDeviceId(),
      champion: toItem(champion),
      matches,
    });

    // sendBeacon 在页面卸载时依然可靠，但它发的是 text/plain，
    // 服务端用 request.json() 解析不受 Content-Type 影响，所以可用。
    // 失败则退回 fetch + keepalive。
    if (navigator.sendBeacon && body.length < 60000) {
      const ok = navigator.sendBeacon('/api/vote/batch', new Blob([body], { type: 'application/json' }));
      if (ok) return;
    }

    fetch('/api/vote/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* 上报失败绝不影响主流程 */
  }
}

/** 拉取大众榜。失败返回 null，调用方据此隐藏榜单模块即可。 */
export async function fetchStats(scope, { limit = 20, type } = {}) {
  try {
    if (!scope) return null;
    const qs = new URLSearchParams({ limit: String(limit) });
    if (type) qs.set('type', type);
    const res = await fetch(`/api/stats/${encodeURIComponent(scope)}?${qs}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
