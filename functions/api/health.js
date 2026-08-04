// functions/api/health.js — 健康检查端点（纯存活探针）
// 前端 checkBackend() 请求 /api/health 检测后端是否可用。
// 来源校验由 _middleware.js 统一处理；此处仅保证响应不被缓存。
// 注意：health 反映"函数是否存活"，不探测真实音乐上游——逐请求降级由代理 502 触发。

export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
