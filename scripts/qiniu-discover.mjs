#!/usr/bin/env node
// 用 AK/SK 自动探测七牛：空间列表 / 域名 / 区域（只读，不改任何数据）
import { createHmac } from 'node:crypto';

const AK = process.env.QINIU_AK;
const SK = process.env.QINIU_SK;
if (!AK || !SK) { console.error('缺少 QINIU_AK / QINIU_SK'); process.exit(1); }

const urlSafe = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
function qbox(method, path) {
  const signingStr = `${method} ${path}\n`; // 末尾必须带 \n（七牛 QBox 签名规范）
  const sign = urlSafe(createHmac('sha1', SK).update(signingStr).digest('base64'));
  return `QBox ${AK}:${sign}`;
}
async function get(host, path) {
  const res = await fetch(`https://${host}${path}`, { headers: { Authorization: qbox('GET', path) } });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${host}${path} -> HTTP ${res.status} ${txt}`);
  return txt;
}

try {
  const buckets = JSON.parse(await get('rs.qbox.me', '/buckets'));
  console.log('📦 空间列表:', JSON.stringify(buckets));
  if (!Array.isArray(buckets) || buckets.length === 0) {
    console.log('\n⚠️ 还没有任何存储空间。请先在七牛控制台「空间管理 → 新建空间」（访问控制选公开），然后再把空间名告诉我。');
    process.exit(0);
  }
  const bucket = buckets[0];
  let domains = [];
  try { domains = JSON.parse(await get('api.qiniu.com', `/v6/domain/list?tbl=${bucket}`)); } catch (e) { console.log('域名查询失败:', e.message); }
  let zone = 'z2';
  try {
    const q = JSON.parse(await get('uc.qbox.me', `/v2/query?bucket=${bucket}`));
    zone = q.hosts?.[0]?.region || q.region || 'z2';
  } catch (e) { console.log('区域查询失败:', e.message); }

  const domain = (Array.isArray(domains) && domains.find((x) => /\.clouddn\.com$/.test(x))) || domains[0] || '';
  console.log('\n✅ 探测结果：');
  console.log('  QINIU_BUCKET =', bucket);
  console.log('  QINIU_ZONE   =', zone);
  console.log('  QINIU_DOMAIN =', domain || '(无域名，需在空间「域名设置」里查看/绑定)');
  console.log('\n把以上三项发我即可（AK/SK 你已经给过了）。');
} catch (e) {
  console.error('💥 探测异常：', e.message);
  process.exit(1);
}
