// src/lib/backend.js — 后端可用性检测（共享模块）
// 部署在 Cloudflare Pages 上时 /api/health 可用，前端优先走后端代理
// 部署在 surge.sh 等纯静态环境时 /api/health 不存在，自动回退到 JSONP

let backendAvailable = null;

export async function checkBackend() {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch('/api/health', { signal: ctrl.signal });
    clearTimeout(timer);
    backendAvailable = res.ok;
  } catch {
    backendAvailable = false;
  }
  return backendAvailable;
}

/** 标记后端不可用（代理请求失败时调用，后续不再尝试后端） */
export function markBackendUnavailable() {
  backendAvailable = false;
}
