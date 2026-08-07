// Cloudflare Pages Function: 封面代理（七牛 HTTP → 前端 HTTPS）
// GET /api/img/covers/:file  →  七牛 http://<QINIU_DOMAIN>/covers/:file

const QINIU_HTTP_BASE = 'http://tjdpdufre.hn-bkt.clouddn.com';

const PLACEHOLDER_PNG = new Uint8Array([
  0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,
  0x49,0x48,0x44,0x52,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
  0x08,0x06,0x00,0x00,0x00,0x1F,0x15,0xC4,0x89,0x00,0x00,0x00,
  0x0A,0x49,0x44,0x41,0x54,0x78,0x9C,0x62,0x00,0x02,0x00,0x00,
  0x05,0x00,0x01,0x0A,0xF3,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,
  0x44,0xAE,0x42,0x60,0x82,
]);

export async function onRequestGet(context) {
  const { params } = context;
  const file = params.file || '';

  if (file.includes('..') || file.includes('/')) {
    return new Response('Bad Request', { status: 400 });
  }

  try {
    const resp = await fetch(`${QINIU_HTTP_BASE}/covers/${file}`, {
      headers: { 'Accept': 'image/*', 'User-Agent': 'MusicWorldCup/1.0' },
      cf: { cacheTtl: 604800, cacheEverything: true },
    });
    if (!resp.ok) return new Response(PLACEHOLDER_PNG, { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' } });
    return new Response(resp.body, {
      status: 200,
      headers: {
        'Content-Type': resp.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response(PLACEHOLDER_PNG, { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' } });
  }
}
