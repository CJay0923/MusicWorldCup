// scripts/migrate-singer-data-to-d1.mjs
//
// 把 src/data/singerData/*.json（歌手预取数据）迁移进 D1 关系表：
//   singers / singer_songs / singer_album_descriptions
// 对应 db/singer-data-schema.sql。
//
// 设计：
//  - 不存整包 JSON：D1 单语句上限 100KB，歌手 payload 可达数百 KB 会超限。
//    改为由关系表在 /api/singer/[mid] 重组为前端所需的 raw 形状（见该 Function）。
//  - singer_songs 按 100 绑定参数上限分批（15 列 → 每批 6 行）。
//  - 先 DELETE 再 INSERT，保证可重复执行（幂等）。
//  - 关键：wrangler d1 execute --file 会把整个 .sql 作为「单条」SQL 字符串发给 D1，
//    D1 限制单条 SQL < 100KB。因此本脚本把语句按 ~80KB 切分为多个临时文件，
//    每个文件单独执行，绕过该限制。
//
// 用法：
//   node scripts/migrate-singer-data-to-d1.mjs            # 写入远程 D1
//   node scripts/migrate-singer-data-to-d1.mjs --local    # 写入本地模拟 D1（冒烟用）
//
// 依赖 wrangler（已装 devDependency）。

import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const SRC_DIR = fileURLToPath(new URL('../src/data/singerData/', import.meta.url));
const LOCAL = process.argv.includes('--local');
const NOW = Math.floor(Date.now() / 1000);

// 每个临时文件的目标上限。
// 实测：本地 miniflare 约 100KB/条，但远端真实 D1 对单条 SQL 上限更紧（~64KB 即报
// SQLITE_TOOBIG）。保守取 45KB，且保证单个 INSERT 语句也远小于该值。
const FILE_BYTE_LIMIT = 45 * 1024;

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

// 多行 VALUES 批量 INSERT，受 100 绑定参数限制。返回「语句数组」（每条可单独执行）。
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

// ---------- 读取歌手 JSON ----------
const files = readdirSync(SRC_DIR)
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .sort();

console.log(`[migrate] 发现 ${files.length} 个歌手数据文件`);

const singersRows = [];
const songsRows = [];
const albumDescRows = [];

for (const file of files) {
  const singerMid = file.replace(/\.json$/, '');
  const raw = JSON.parse(readFileSync(join(SRC_DIR, file), 'utf8'));
  const entrants = Array.isArray(raw.entrants) ? raw.entrants : [];
  const albumDescs = raw.albumDescs && typeof raw.albumDescs === 'object' ? raw.albumDescs : {};

  singersRows.push([
    singerMid,
    raw.singerName || singerMid,
    raw.singerPhoto || '',
    raw.bio || '', // 歌手简介（手动导入/管理用，无则空）
    0, // source_total_song（JSON 无此字段）
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
      i, // ord：原始顺序，重组保序
      s.songmid || '',
      s.songid ?? null,
      s.name || '',
      s.albumMid || '',
      s.albumName || '',
      s.albumDate || '',
      s.albumType || '',
      s.favCount ?? 0,
      0, // seed_rank（运行时重算）
      s.itunesPreviewUrl || '',
      s.itunesTrackUrl || '',
      s.itunesTrackId ?? null,
      s.pic || '',           // 原 pic（本地封面路径/URL）
      s.miguPreviewUrl || '', // 原 miguPreviewUrl（咪咕试听）
      s.representative ? 1 : 0, // 是否代表作品（手动导入标记）
      NOW,
    ]);
  });

  const seenDesc = new Set();
  for (const [albumMid, desc] of Object.entries(albumDescs)) {
    const am = albumMid || '';
    if (!am) continue; // 跳过空 album_mid，避免 (singer_mid,'') 主键冲突
    const dkey = singerMid + '\u0000' + am;
    if (seenDesc.has(dkey)) continue; // 同歌手内去重
    seenDesc.add(dkey);
    albumDescRows.push([singerMid, am, desc || '']);
  }
}

// ---------- 组装语句（DELETE 在前，保证幂等）----------
let statements = [];
statements.push('DELETE FROM singer_songs;');
statements.push('DELETE FROM singer_album_descriptions;');
statements.push('DELETE FROM singers;');

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

// 17 列 → 每批 6 行（内联值非绑定，仅受 100KB 单语句限制，6 行远小于该上限）；
// 同歌手重复 song_mid 用 OR IGNORE 去重
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

// 3 列 → 每批 1 行：单条声明 ≤ 最大单条描述(24.8KB)，稳稳低于远端 ~64KB 上限；
// 文件级仍按 45KB 聚合，约 15 行/次调用，调用数可控。
statements = statements.concat(
  chunkInsert(
    'singer_album_descriptions',
    ['singer_mid', 'album_mid', 'description'],
    albumDescRows,
    1,
    true, // INSERT OR IGNORE：容忍个别重复 (singer_mid,album_mid)，不阻断整轮迁移
  ),
);

// ---------- 把语句按字节切分为多个 <100KB 的临时文件并执行 ----------
// 每个文件开头加 PRAGMA foreign_keys = OFF：远程库存在 votes 等 FK 引用表，
// 直接 DELETE singers 会被外键约束阻止。关掉当前连接的 FK 强制即可安全重建
// （仅会话级生效，不改动库结构；重建完成后连接关闭，FK 约束自动恢复）。
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
  `[migrate] 共 ${statements.length} 条语句，切分为 ${groups.length} 个临时文件（≤${FILE_BYTE_LIMIT}B）`,
);
console.log(
  `[migrate] 数据量: ${singersRows.length} singers, ${songsRows.length} songs, ` +
    `${albumDescRows.length} album_descs`,
);

let okCount = 0;
groups.forEach((g, i) => {
  const sizeB = Buffer.byteLength(g, 'utf8');
  const tmp = join(tmpdir(), `mwc-singer-migrate-${Date.now()}-${i}.sql`);
  writeFileSync(tmp, g, 'utf8');
  const args = ['d1', 'execute', 'mwc-db', LOCAL ? '--local' : '--remote', '--file=' + tmp];
  process.stdout.write(`[migrate] [${i + 1}/${groups.length}] executing (${sizeB}B)... `);

  // 瞬时错误（Cloudflare API 鉴权抖动 / /import 偶发失败）重试，避免整轮被单点打挂
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
      done = true; // 非瞬时或重试耗尽，标记结束（计入失败）
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
