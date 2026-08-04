// 将 public/covers 下的所有封面上传到 Cloudflare R2
//
// 目的: 把 2778 张封面(约 113MB)从 dist 中剥离，迁移到 R2 对象存储，
//       使部署体积从 ~126MB 降到 <10MB，并让封面走 R2 全球 CDN。
//       前端通过 VITE_COVER_BASE 注入的 R2 公共地址加载封面（见 src/lib/assets.js）。
//
// 依赖: npm i @aws-sdk/client-s3
//
// 环境变量（从 Cloudflare 控制台 → R2 → 账户详情 获取）:
//   R2_ACCOUNT_ID      你的 Cloudflare 账户 ID
//   R2_ACCESS_KEY_ID   R2 API 令牌的 Access Key ID
//   R2_SECRET_ACCESS_KEY R2 API 令牌的 Secret
//   R2_BUCKET          桶名（需先 `wrangler r2 bucket create mwc-covers`）
//   可选 R2_PREFIX     上传前缀，默认 "covers"
//   可选 DRY_RUN       设为 1 只扫描不实际上传
//
// 用法:
//   node scripts/migrate-covers-to-r2.mjs
//   DRY_RUN=1 node scripts/migrate-covers-to-r2.mjs
//
// 上传后公开访问（二选一）:
//   1) R2.dev 公共地址: 控制台开启 "Public Development" → https://<bucket>.<subdomain>.r2.dev
//   2) 自定义域: 绑定自己的域名（推荐，可配 CORS 供 canvas 使用）
//   然后把地址写入构建环境变量 VITE_COVER_BASE，例如:
//     VITE_COVER_BASE=https://cdn.example.com  npm run build
//   或写入 .env / CI 变量。

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const COVERS_DIR = join(ROOT, 'public', 'covers');
const PREFIX = process.env.R2_PREFIX || 'covers';
const DRY_RUN = process.env.DRY_RUN === '1';
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);

function env(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`缺少环境变量 ${name}`);
    process.exit(1);
  }
  return v;
}

const ACCOUNT_ID = env('R2_ACCOUNT_ID');
const ACCESS_KEY_ID = env('R2_ACCESS_KEY_ID');
const SECRET = env('R2_SECRET_ACCESS_KEY');
const BUCKET = env('R2_BUCKET');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET },
});

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

async function listExisting() {
  const existing = new Set();
  let token;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token }),
    );
    for (const o of res.Contents || []) existing.add(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return existing;
}

async function main() {
  if (!statSync(COVERS_DIR, { optional: true })) {
    console.error(`未找到封面目录: ${COVERS_DIR}`);
    process.exit(1);
  }
  const files = walk(COVERS_DIR);
  console.log(`扫描到 ${files.length} 个封面文件`);

  if (DRY_RUN) {
    console.log('[DRY_RUN] 仅扫描，未上传。');
    return;
  }

  const existing = await listExisting();
  console.log(`R2 桶内已有 ${existing.size} 个对象`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let idx = 0;

  async function worker() {
    while (idx < files.length) {
      const file = files[idx++];
      const rel = relative(COVERS_DIR, file).split('\\').join('/');
      const key = `${PREFIX}/${rel}`;
      if (existing.has(key)) {
        skipped++;
        continue;
      }
      try {
        const body = await import('node:fs/promises').then((m) => m.readFile(file));
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: 'image/jpeg' }));
        uploaded++;
        if (uploaded % 100 === 0) console.log(`  已上传 ${uploaded}/${files.length}`);
      } catch (e) {
        failed++;
        console.error(`  失败 ${key}: ${e.message}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker);
  await Promise.all(workers);

  console.log(`\n完成: 上传 ${uploaded}, 跳过(已存在) ${skipped}, 失败 ${failed}`);
  if (uploaded > 0) {
    console.log('下一步: 开启 R2 公开访问，并把公共地址写入 VITE_COVER_BASE 后重新构建。');
    console.log('提示: 迁移完成后可删除 public/covers 以缩减 dist 体积。');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
