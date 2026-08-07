#!/usr/bin/env node
// 七牛封面 / 歌手头像 批量上传（零依赖：Node 内置 crypto + fetch）
//
// 作用：把 public/covers/* 与 public/singers/* 按「相对 public 的路径」原样上传到七牛桶，
//       即 public/covers/album_x.jpg -> <bucket>/covers/album_x.jpg
//          public/singers/singer_y.jpg -> <bucket>/singers/singer_y.jpg
//       与 src/lib/assets.js 里 coverUrl/singerPhotoUrl 的 key 规则完全一致，
//       设好 VITE_COVER_BASE 后即可全部命中。
//
// 用法（环境变量，密钥绝不进仓库）：
//   QINIU_AK=xxx QINIU_SK=xxx QINIU_BUCKET=xxx \
//   QINIU_DOMAIN=https://<你的七牛绑定域名> QINIU_ZONE=z2 \
//   node scripts/upload-covers-qiniu.mjs
//
//   QINIU_ZONE: z0=华东 up.qiniup.com / z1=华北 / z2=华南(默认) / na0=北美 / as0=东南亚
//
// 说明：
//   - insertOnly=1，已存在的文件返回 614 直接跳过（可安全重跑补传）。
//   - 并发上限 8，避免触发七牛频率限制。
//   - 跑完会抽样 HEAD 几个 URL 确认 200。

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';

const AK = process.env.QINIU_AK;
const SK = process.env.QINIU_SK;
const BUCKET = process.env.QINIU_BUCKET;
const DOMAIN = (process.env.QINIU_DOMAIN || '').replace(/\/+$/, '');
const ZONE = process.env.QINIU_ZONE || 'z2';

if (!AK || !SK || !BUCKET || !DOMAIN) {
  console.error('❌ 缺少环境变量：需要 QINIU_AK / QINIU_SK / QINIU_BUCKET / QINIU_DOMAIN');
  process.exit(1);
}

const UP_HOSTS = {
  z0: 'https://up.qiniup.com',
  z1: 'https://up-z1.qiniup.com',
  z2: 'https://up-z2.qiniup.com',
  na0: 'https://up-na0.qiniup.com',
  as0: 'https://up-as0.qiniup.com',
};
const UP_HOST = UP_HOSTS[ZONE] || UP_HOSTS.z2;

const urlsafeBase64 = (s) =>
  Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

function makeToken(key) {
  const putPolicy = {
    scope: key ? `${BUCKET}:${key}` : BUCKET,
    deadline: Math.floor(Date.now() / 1000) + 3600,
    insertOnly: 1,
  };
  const encoded = urlsafeBase64(JSON.stringify(putPolicy));
  const sign = createHmac('sha1', SK).update(encoded).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_');
  return `${AK}:${sign}:${encoded}`;
}

const ROOTS = ['public/covers', 'public/singers'];

async function collect(dir) {
  const out = [];
  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.jpg$/i.test(e.name)) out.push(p);
    }
  }
  await walk(dir);
  return out;
}

async function uploadFile(filePath) {
  // 统一转为 POSIX 正斜杠 key（Windows join 产生反斜杠）
  const key = filePath.replace(/\\/g, '/').replace(/^public\//, '');
  const token = makeToken(key);
  const data = await readFile(filePath);
  const form = new FormData();
  form.append('token', token);
  form.append('key', key);
  form.append('file', new Blob([data], { type: 'image/jpeg' }), key);
  const res = await fetch(`${UP_HOST}/`, { method: 'POST', body: form });
  if (res.status === 614) return 'skip'; // 已存在
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`上传失败 ${key}: HTTP ${res.status} ${txt}`);
  }
  return 'ok';
}

async function main() {
  let files = [];
  for (const r of ROOTS) files = files.concat(await collect(r));
  console.log(`📦 待上传文件：${files.length}（上传域名 ${UP_HOST}）`);

  const CONCURRENCY = 8;
  let done = 0, ok = 0, skip = 0, fail = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < files.length) {
      const i = cursor++;
      const f = files[i];
      try {
        const r = await uploadFile(f);
        if (r === 'skip') skip++; else ok++;
      } catch (e) {
        fail++;
        console.error(`  ✗ ${f}: ${e.message}`);
      }
      done++;
      if (done % 50 === 0) console.log(`  … ${done}/${files.length}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`\n✅ 完成：新增 ${ok} / 跳过(已存在) ${skip} / 失败 ${fail} / 共 ${files.length}`);

  // 抽样校验
  const samples = files.slice(0, 3).map((f) => `${DOMAIN}/${f.replace(/\\/g, '/').replace(/^public\//, '')}`);
  console.log('\n🔍 抽样 HEAD 校验：');
  for (const u of samples) {
    try {
      const r = await fetch(u, { method: 'HEAD' });
      console.log(`  ${r.status}  ${u}`);
    } catch (e) {
      console.log(`  ERR ${u} -> ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error('💥 脚本异常：', e);
  process.exit(1);
});
