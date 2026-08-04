// functions/api/_middleware.js — 全局中间件
// 作用范围：所有 /api/* 路由（Pages Functions 自动挂载）
// 职责：
//   1. 安全响应头（X-Content-Type-Options / X-Frame-Options / Referrer-Policy）
//   2. 音乐代理 + 健康探测的来源校验（防止本域名被当开放代理白嫖）
//   3. 全局请求超时兜底（各代理 handler 另有 8s 上游超时）

const PROXY_PREFIXES = ['/api/qq', '/api/kugou', '/api/netease', '/api/health'];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

function originAllowed(request, env) {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer') || '';
  const reqHost = request.headers.get('Host');

  // 显式白名单（生产自定义域时设置 ALLOWED_ORIGIN）
  if (env && env.ALLOWED_ORIGIN) {
    return (
      (origin && origin === env.ALLOWED_ORIGIN) ||
      referer.startsWith(env.ALLOWED_ORIGIN)
    );
  }

  // 默认：仅允许同源（Origin 或 Referer 的 host 与请求 Host 一致）
  // 自动兼容 pages.dev / workers.dev / 自定义域 / localhost，无需逐域列举
  let checkHost = null;
  if (origin) {
    try {
      checkHost = new URL(origin).host;
    } catch {
      return false;
    }
  } else if (referer) {
    try {
      checkHost = new URL(referer).host;
    } catch {
      return false;
    }
  } else {
    return true; // 无 Origin 且无 Referer（同域 beacon / 直连脚本）
  }
  return checkHost === reqHost;
}

export async function onRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname;

  // 仅对音乐代理 + 健康探测做来源校验；/api/vote、/api/stats 有各自逻辑
  const isProxy = PROXY_PREFIXES.some((p) => path.startsWith(p));
  if (isProxy && !originAllowed(request, env)) {
    return new Response('Forbidden', { status: 403 });
  }

  // 全局请求超时兜底（9s）
  const timeout = new Promise((resolve) =>
    setTimeout(
      () => resolve(new Response('Gateway Timeout', { status: 504 })),
      9000,
    ),
  );

  let response;
  try {
    response = await Promise.race([context.next(), timeout]);
  } catch {
    response = new Response('Bad Gateway', { status: 502 });
  }

  // 安全头（不覆盖 handler 已设置的 Cache-Control，以免破坏阶段 1 缓存）
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(k, v);
  }
  if (!response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
}
