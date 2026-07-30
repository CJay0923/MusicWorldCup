// functions/api/health.js — 健康检查端点
// 前端 checkBackend() 请求 /api/health 检测后端是否可用

export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
