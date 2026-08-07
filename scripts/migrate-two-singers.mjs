// scripts/migrate-two-singers.mjs
//
// 轻量迁移：只把指定的 2 位歌手（默认 alin / cheer）写入远程 D1，
// 不触碰已入库的其他歌手。用于增量补歌手，避免全量 DELETE 重跑。
//
// 逻辑：
//  - 先 DELETE WHERE singer_mid IN ('alin','cheer') 清掉这 2 位的旧行
//    （幂等，重跑安全），再 INSERT OR IGNORE 重插。
//  - 复用 migrate-singer-data-to-d1.mjs 的列结构与 q() 转义。
//  - 按 45KB 切分临时文件逐个执行，绕过 D1 单条 SQL < 100KB 限制。
//  - 每个文件开头 PRAGMA foreign_keys = OFF 应对远程 votes 表 FK 约束。
//
// 用法：
//   node scripts/migrate-two-singers.mjs                 # 写入远程 D1（默认 alin,cheer）
//   node scripts/migrate-two-singers.mjs --local         # 写入本地模拟 D1
//   node scripts/migrate-two-singers.mjs alin cheer      # 指定歌手 mid（覆盖默认）

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const SRC_DIR = fileURLToPath(new URL('../src/data/singerData/', import.meta.url));
const LOCAL = process.argv.includes('--local');
const NOW = Math.floor(Date.now() / 1000);
const FILE_BYTE_LIMIT = 45 * 1024;

// 从命令行取目标歌手 mid（仅取脚本名之后的真实参数，过滤 --local 等开关）
const TARGETS = process.argv
  .slice(2)
  .filter((a) => !a.startsWith('-'))
  .filter(Boolean);
const targetMids = TARGETS.length > 0 ? TARGETS : ['alin', 'cheer'];

// ---------- SQL 转义 ----------
function q(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return (
    "'" +
    String(v)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ') +
    "'"
  );
}

function chunkInsert(table, columns, rows, perBatch, ignore = false) {
  if (rows.length === 0) return [];
  const colList = columns.join(', ');
  const verb = ignore ? 'INSERT OR IGNORE INTO' : 'INSERT INTO';
  const stmts = [];
  for (let i = 0; i < rows.length; i += perBatch) {
    const slice = rows.slice(i, i + perBatch);
    const vals = slice.map((r) => '(' + r.map(q).join(', ') + ')').join(',\n  ');
    stmts.push(`${verb} ${table} (${colList}) VALUES\n  ${vals};`);
  }
  return stmts;
}

// ---------- 读取目标歌手 JSON ----------
const singersRows = [];
const songsRows = [];
const albumDescRows = [];

for (const singerMid of targetMids) {
  const file = `${singerMid}.json`;
  let raw;
  try {
    raw = JSON.parse(readFileSync(join(SRC_DIR, file), 'utf8'));
  } catch (e) {
    console.error(`[migrate] ❌ 找不到或无法解析 ${file}: ${e.message}`);
    process.exit(1);
  }
  const entrants = Array.isArray(raw.entrants) ? raw.entrants : [];
  const albumDescs = raw.albumDescs && typeof raw.albumDescs === 'object' ? raw.albumDescs : {};

  singersRows.push([
    singerMid,
    raw.singerName || singerMid,
    raw.singerPhoto || '',
    raw.bio || '',
    0,
    Object.keys(albumDescs).length,
    entrants.length,
    raw.source || 'kugou',
    raw.preprocessed ? 1 : 0,
    NOW,
    NOW,
  ]);

  entrants.forEach((s, i) => {
    songsRows.push([
      singerMid,
      i,
      s.songmid || '',
      s.songid ?? null,
      s.name || '',
      s.albumMid || '',
      s.albumName || '',
      s.albumDate || '',
      s.albumType || '',
      s.favCount ?? 0,
      0,
      s.itunesPreviewUrl || '',
      s.itunesTrackUrl || '',
      s.itunesTrackId ?? null,
      s.pic || '',
      s.miguPreviewUrl || '',
      s.representative ? 1 : 0,
      NOW,
    ]);
  });

  const seenDesc = new Set();
  for (const [albumMid, desc] of Object.entries(albumDescs)) {
    const am = albumMid || '';
    if (!am) continue;
    const dkey = singerMid + '\u0000' + am;
    if (seenDesc.has(dkey)) continue;
    seenDesc.add(dkey);
    albumDescRows.push([singerMid, am, desc || '']);
  }
}

// ---------- 组装语句（仅删这 2 位 → 再插）----------
const inList = targetMids.map(q).join(', ');
let statements = [];
statements.push(`DELETE FROM singer_songs WHERE singer_mid IN (${inList});`);
statements.push(`DELETE FROM singer_album_descriptions WHERE singer_mid IN (${inList});`);
statements.push(`DELETE FROM singers WHERE singer_mid IN (${inList});`);

statements = statements.concat(
  chunkInsert(
    'singers',
    [
      'singer_mid', 'name', 'photo', 'bio', 'source_total_song', 'source_album_count',
      'entrant_count', 'data_source', 'preprocessed', 'created_at', 'updated_at',
    ],
    singersRows,
    50,
  ),
);

statements = statements.concat(
  chunkInsert(
    'singer_songs',
    [
      'singer_mid', 'ord', 'song_mid', 'song_id', 'name', 'album_mid', 'album_name',
      'album_date', 'album_type', 'fav_count', 'seed_rank', 'itunes_preview_url',
      'itunes_track_url', 'itunes_track_id', 'pic', 'migu_preview_url',
      'is_representative', 'created_at',
    ],
    songsRows,
    6,
    true,
  ),
);

statements = statements.concat(
  chunkInsert(
    'singer_album_descriptions',
    ['singer_mid', 'album_mid', 'description'],
    albumDescRows,
    1,
    true,
  ),
);

// ---------- 切分临时文件并执行 ----------
const FK_OFF = 'PRAGMA foreign_keys = OFF;\n';
const groups = [];
let cur = '';
let curBytes = 0;
for (const st of statements) {
  const b = Buffer.byteLength(st, 'utf8');
  if (curBytes > 0 && curBytes + b > FILE_BYTE_LIMIT) {
    groups.push(FK_OFF + cur);
    cur = '';
    curBytes = 0;
  }
  cur += st + '\n';
  curBytes += b + 1;
}
if (curBytes > 0) groups.push(FK_OFF + cur);

console.log(
  `[migrate] 目标歌手: ${targetMids.join(', ')} | ${singersRows.length} singers, ` +
    `${songsRows.length} songs, ${albumDescRows.length} album_descs`,
);
console.log(`[migrate] 共 ${statements.length} 条语句，切分为 ${groups.length} 个临时文件`);

let okCount = 0;
groups.forEach((g, i) => {
  const sizeB = Buffer.byteLength(g, 'utf8');
  const tmp = join(tmpdir(), `mwc-two-migrate-${Date.now()}-${i}.sql`);
  writeFileSync(tmp, g, 'utf8');
  const args = ['d1', 'execute', 'mwc-db', LOCAL ? '--local' : '--remote', '--file=' + tmp];
  process.stdout.write(`[migrate] [${i + 1}/${groups.length}] executing (${sizeB}B)... `);

  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  let done = false;
  for (let attempt = 1; attempt <= 3 && !done; attempt++) {
    try {
      const out = execFileSync('npx', ['wrangler', ...args], {
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true,
        timeout: 60000,
      });
      const last = out.split('\n').filter((l) => /success|rows|duration|Error/i.test(l)).slice(-3).join(' ');
      if (attempt > 1) process.stdout.write(`(retry ${attempt - 1}) `);
      console.log(`OK ${last}`);
      okCount++;
      done = true;
    } catch (e) {
      const msg = `${e.stderr || ''}${e.stdout || ''}${e.message || ''}`;
      const transient = /Authentication|import\) failed|code:\s*10000|timed out|ETIMEDOUT/i.test(msg);
      if (transient && attempt < 3) {
        console.error(`\n[migrate] [${i + 1}/${groups.length}] 瞬时错误，重试 ${attempt}/3...`);
        sleep(2000);
        continue;
      }
      console.error(`\n[migrate] [${i + 1}/${groups.length}] ❌ 失败:`);
      console.error((e.stdout || '').split('\n').slice(-8).join('\n'));
      console.error(e.stderr || e.message);
      done = true;
    }
  }
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
});

if (okCount === groups.length) {
  console.log('[migrate] ✅ 全部完成');
} else {
  console.error(`[migrate] ⚠️ ${okCount}/${groups.length} 成功，存在失败批次`);
  process.exit(1);
}
