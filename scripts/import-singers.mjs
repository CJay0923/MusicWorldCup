// scripts/import-singers.mjs
//
// 批量 / 逐条 添加歌手到 D1（并同步写入 src/data/singerData/{mid}.json 作为规范源）。
//
// 设计要点（与现有管线兼容）:
//  - D1 是「从 singerData JSON 重建的缓存」：migrate-singer-data-to-d1.mjs 每次
//    DELETE + INSERT。因此本脚本在落 D1 的同时**写 singerData JSON**，保证将来
//    重跑迁移时手动添加的歌手不丢失。
//  - 校验: mid 正则 / name 必填 / 每首 works 需 name / bio 长度上限。非法记录进入
//    failed 列表并带原因，不阻断其他记录。
//  - 去重: 导入前 SELECT 已存在的 singer_mid；skip 模式跳过重复，upsert 模式覆盖。
//  - 回滚: 每歌手一个独立事务 (BEGIN ... COMMIT)。某歌手语句失败仅回滚该歌手，
//    不影响其他歌手（粒度更优，且天然满足「插入失败回滚」）。
//  - 反馈: 后校验 SELECT 现有 mid，统计 inserted / skipped / failed 并打印明细。
//
// 用法:
//   node scripts/import-singers.mjs data/new-singers.sample.json
//   node scripts/import-singers.mjs data/new-singers.json --local        # 本地 D1 冒烟
//   node scripts/import-singers.mjs data/new-singers.json --mode=upsert  # 重复则覆盖
//   node scripts/import-singers.mjs data/new-singers.json --dry-run      # 只校验+打印 SQL
//   node scripts/import-singers.mjs data/new-singers.json --force        # 覆盖已存在的 JSON
//
// 输入格式 (JSON，单对象或数组):
// {
//   "mid": "string 唯一键(字母数字_-)",   // 必填，去重键
//   "name": "歌手名",                     // 必填
//   "bio": "简介文本",                     // 可选
//   "photo": "https://...",               // 可选
//   "data_source": "manual",              // 可选，默认 manual
//   "works": [                            // 代表作品 → singer_songs
//     { "name":"稻香", "albumMid":"...", "albumName":"魔杰座", "favCount":900000,
//       "pic":"...", "isRepresentative": true }
//   ],
//   "albumDescs": { "albumMid": "专辑简介" }  // 可选
// }

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const SINGER_DATA_DIR = join(REPO, 'src/data/singerData/');
const LOCAL = process.argv.includes('--local');
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const MODE = (process.argv.find((a) => a.startsWith('--mode=')) || '--mode=skip').split('=')[1];
const INPUT = process.argv.find((a) => !a.startsWith('--') && a.endsWith('.json'));

if (!INPUT) {
  console.error('用法: node scripts/import-singers.mjs <input.json> [--local] [--mode=skip|upsert] [--dry-run] [--force]');
  process.exit(2);
}

const NOW = Math.floor(Date.now() / 1000);
const FILE_BYTE_LIMIT = 45 * 1024; // 与 migrate 脚本一致的远端单语句安全上限

// ---------------- SQL 转义（复用迁移脚本的 q）----------------
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

// ---------------- 校验 ----------------
const MID_RE = /^[A-Za-z0-9_-]{1,40}$/;

function validateSinger(raw, idx) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['不是对象'] };
  }

  const mid = typeof raw.mid === 'string' ? raw.mid.trim() : '';
  if (!mid) errors.push('mid 缺失');
  else if (!MID_RE.test(mid)) errors.push(`mid 非法 "${mid}"（仅允许字母数字 _ -，≤40 字符）`);
  else if (mid !== mid.toLowerCase()) errors.push(`mid 建议小写 "${mid}"`);

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) errors.push('name 缺失');
  else if (name.length > 200) errors.push('name 超长(>200)');

  const bio = typeof raw.bio === 'string' ? raw.bio : '';
  if (bio.length > 2000) errors.push('bio 超长(>2000)');

  const works = raw.works;
  const workRows = [];
  if (works !== undefined && works !== null) {
    if (!Array.isArray(works)) {
      errors.push('works 必须是数组');
    } else {
      works.forEach((w, i) => {
        const wname = typeof w?.name === 'string' ? w.name.trim() : '';
        if (!wname) {
          errors.push(`works[${i}].name 缺失`);
          return;
        }
        if (wname.length > 200) errors.push(`works[${i}].name 超长`);
        let fav = w?.favCount;
        if (fav === undefined || fav === null) fav = 0;
        if (typeof fav !== 'number' || !Number.isFinite(fav) || fav < 0) {
          errors.push(`works[${i}].favCount 非法`);
          fav = 0;
        }
        const songMid =
          typeof w?.songMid === 'string' && w.songMid.trim()
            ? w.songMid.trim()
            : `manual-${mid}-${i}`;
        workRows.push({
          songMid,
          songId: typeof w?.songId === 'number' ? w.songId : null,
          name: wname,
          albumMid: typeof w?.albumMid === 'string' ? w.albumMid : '',
          albumName: typeof w?.albumName === 'string' ? w.albumName : '',
          albumDate: typeof w?.albumDate === 'string' ? w.albumDate : '',
          albumType: typeof w?.albumType === 'string' ? w.albumType : '',
          favCount: Math.floor(fav),
          itunesPreviewUrl: typeof w?.itunesPreviewUrl === 'string' ? w.itunesPreviewUrl : '',
          itunesTrackUrl: typeof w?.itunesTrackUrl === 'string' ? w.itunesTrackUrl : '',
          itunesTrackId: typeof w?.itunesTrackId === 'number' ? w.itunesTrackId : null,
          pic: typeof w?.pic === 'string' ? w.pic : '',
          miguPreviewUrl: typeof w?.miguPreviewUrl === 'string' ? w.miguPreviewUrl : '',
          isRepresentative: w?.isRepresentative === true ? 1 : 0,
        });
      });
    }
  }

  // albumDescs: { albumMid: 描述 }
  const albumDescs = [];
  if (raw.albumDescs && typeof raw.albumDescs === 'object' && !Array.isArray(raw.albumDescs)) {
    for (const [am, desc] of Object.entries(raw.albumDescs)) {
      albumDescs.push([am || '', typeof desc === 'string' ? desc : '']);
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    singer: {
      mid,
      name,
      bio,
      photo: typeof raw.photo === 'string' ? raw.photo : '',
      data_source: typeof raw.data_source === 'string' && raw.data_source ? raw.data_source : 'manual',
      works: workRows,
      albumDescs,
    },
  };
}

// ---------------- 读取 + 校验输入 ----------------
let input;
try {
  const text = readFileSync(INPUT, 'utf8');
  input = JSON.parse(text);
} catch (e) {
  console.error(`读取/解析输入失败: ${e.message}`);
  process.exit(2);
}
const list = Array.isArray(input) ? input : [input];

console.log(`[import] 输入 ${list.length} 条记录，开始校验...`);
const valid = [];
const failed = [];
list.forEach((raw, i) => {
  const r = validateSinger(raw, i);
  if (r.ok) valid.push(r.singer);
  else failed.push({ mid: raw?.mid ?? `#${i}`, errors: r.errors });
});

console.log(`[import] 校验通过 ${valid.length} 条，校验失败 ${failed.length} 条`);
if (failed.length) {
  for (const f of failed) console.error(`  ❌ ${f.mid}: ${f.errors.join('; ')}`);
}
if (!valid.length) {
  console.error('[import] 无有效记录，退出');
  process.exit(1);
}

// ---------------- 去重：查已存在的 mid ----------------
const validMids = valid.map((s) => s.mid);
let existing = new Set();

// 用 --json 稳健解析 wrangler d1 execute 的输出，提取某列的值集合
function queryColumnValues(sql, column) {
  const tmp = join(tmpdir(), `mwc-q-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(tmp, sql, 'utf8');
  try {
    const out = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'mwc-db', LOCAL ? '--local' : '--remote', '--json', '--file=' + tmp],
      { encoding: 'utf8', stdio: 'pipe', shell: true, timeout: 60000 },
    );
    const vals = new Set();
    const data = JSON.parse(out);
    // wrangler 可能返回 { results:[{...}] } 或 [{ results:[...] }]（多语句）
    const stmtResults = Array.isArray(data) ? data : [data];
    for (const stmt of stmtResults) {
      const rows = stmt?.results;
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (row && row[column] !== undefined) vals.add(String(row[column]));
      }
    }
    return vals;
  } catch (e) {
    console.error(`[import] 查询失败（按「空结果」处理）: ${(e.stderr || e.stdout || e.message || '').slice(0, 200)}`);
    return new Set();
  }
}

if (!DRY_RUN && !LOCAL && validMids.length) {
  // 注意: wrangler d1 execute --file 不支持 ? 占位符，需内联（mids 已校验，安全）
  const inList = validMids.map(q).join(',');
  existing = queryColumnValues(
    `SELECT singer_mid FROM singers WHERE singer_mid IN (${inList});`,
    'singer_mid',
  );
}

const toInsert = [];
const skipped = [];
for (const s of valid) {
  if (existing.has(s.mid)) {
    if (MODE === 'upsert') toInsert.push(s);
    else skipped.push(s.mid);
  } else {
    toInsert.push(s);
  }
}
console.log(`[import] 待插入 ${toInsert.length} 条（upsert 模式含已存在 ${MODE === 'upsert' ? toInsert.filter((s) => existing.has(s.mid)).length : 0} 条），跳过重复 ${skipped.length} 条`);

// ---------------- 写 singerData JSON（规范源）----------------
mkdirSync(SINGER_DATA_DIR, { recursive: true });
function writeSingerJson(s) {
  const sorted = [...s.works].sort((a, b) => b.favCount - a.favCount);
  const entrants = sorted.map((w, i) => ({
    songmid: w.songMid,
    songid: w.songId,
    name: w.name,
    pic: w.pic,
    albumMid: w.albumMid,
    albumName: w.albumName,
    albumDate: w.albumDate,
    albumType: w.albumType,
    favCount: w.favCount,
    seedRank: i + 1,
    itunesPreviewUrl: w.itunesPreviewUrl,
    itunesTrackUrl: w.itunesTrackUrl,
    itunesTrackId: w.itunesTrackId,
    miguPreviewUrl: w.miguPreviewUrl,
    representative: w.isRepresentative === 1,
  }));
  const albumDescs = {};
  for (const [am, desc] of s.albumDescs) albumDescs[am] = desc;
  const obj = {
    singerName: s.name,
    singerPhoto: s.photo,
    source: s.data_source,
    preprocessed: true,
    bio: s.bio,
    albumDescs,
    entrants,
  };
  const file = join(SINGER_DATA_DIR, `${s.mid}.json`);
  if (existsSync(file) && !FORCE) {
    console.error(`  ⚠️ ${s.mid}.json 已存在，跳过写 JSON（用 --force 覆盖）`);
    return false;
  }
  writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  return true;
}

const jsonWritten = [];
if (!DRY_RUN) {
  for (const s of toInsert) {
    if (writeSingerJson(s)) jsonWritten.push(s.mid);
  }
}

// ---------------- 构建 SQL（每歌手一个事务）----------------
const SINGER_COLS = [
  'singer_mid', 'name', 'photo', 'bio', 'source_total_song', 'source_album_count',
  'entrant_count', 'data_source', 'preprocessed', 'created_at', 'updated_at',
];
const SONG_COLS = [
  'singer_mid', 'ord', 'song_mid', 'song_id', 'name', 'album_mid', 'album_name',
  'album_date', 'album_type', 'fav_count', 'seed_rank', 'itunes_preview_url',
  'itunes_track_url', 'itunes_track_id', 'pic', 'migu_preview_url',
  'is_representative', 'created_at',
];
const DESC_COLS = ['singer_mid', 'album_mid', 'description'];

function buildSingerBlock(s, isUpsert) {
  // 注意: D1 不支持 SQL 的 BEGIN/COMMIT（会报 "use transaction() APIs"）。
  // 改为「每个歌手一次 wrangler d1 execute 调用 = 一个事务」，
  // 调用内部整体原子，失败时自动回滚该歌手全部语句。
  const lines = [];

  // singers 行
  const singerVals = [
    s.mid, s.name, s.photo, s.bio, 0,
    s.albumDescs.length, s.works.length, s.data_source, 1, NOW, NOW,
  ].map(q);
  if (isUpsert) {
    lines.push(
      `INSERT INTO singers (${SINGER_COLS.join(', ')}) VALUES (${singerVals.join(', ')})\n` +
        `  ON CONFLICT(singer_mid) DO UPDATE SET\n` +
        `    name=excluded.name, photo=excluded.photo, bio=excluded.bio,\n` +
        `    source_album_count=excluded.source_album_count, entrant_count=excluded.entrant_count,\n` +
        `    data_source=excluded.data_source, preprocessed=excluded.preprocessed, updated_at=excluded.updated_at;`,
    );
    // upsert：先清旧子表，再整批重插
    lines.push(`DELETE FROM singer_songs WHERE singer_mid=${q(s.mid)};`);
    lines.push(`DELETE FROM singer_album_descriptions WHERE singer_mid=${q(s.mid)};`);
  } else {
    lines.push(`INSERT INTO singers (${SINGER_COLS.join(', ')}) VALUES (${singerVals.join(', ')});`);
  }

  // songs —— 每首一条 INSERT（单值 VALUES），避免本地 miniflare 对多行元组列表的解析问题，
  // 同时远程 D1 也完全兼容。
  for (const [i, w] of s.works.entries()) {
    const vals = [
      s.mid, i, w.songMid, w.songId, w.name, w.albumMid, w.albumName,
      w.albumDate, w.albumType, w.favCount, i + 1, w.itunesPreviewUrl,
      w.itunesTrackUrl, w.itunesTrackId, w.pic, w.miguPreviewUrl,
      w.isRepresentative, NOW,
    ].map(q).join(', ');
    lines.push(`INSERT OR IGNORE INTO singer_songs (${SONG_COLS.join(', ')}) VALUES (${vals});`);
  }

  // album descs —— 同样每条一条 INSERT
  for (const [am, desc] of s.albumDescs) {
    const vals = [s.mid, am, desc].map(q).join(', ');
    if (isUpsert) {
      lines.push(
        `INSERT INTO singer_album_descriptions (${DESC_COLS.join(', ')}) VALUES (${vals}) ` +
          `ON CONFLICT(singer_mid, album_mid) DO UPDATE SET description=excluded.description;`,
      );
    } else {
      lines.push(`INSERT OR IGNORE INTO singer_album_descriptions (${DESC_COLS.join(', ')}) VALUES (${vals});`);
    }
  }

  return lines.join('\n');
}

// 每个歌手一个事务块（含其 songs / album_descs）
const blocks = toInsert.map((s) => ({
  mid: s.mid,
  sql: buildSingerBlock(s, existing.has(s.mid) && MODE === 'upsert'),
}));

if (DRY_RUN) {
  console.log('\n========== DRY-RUN：以下为将要执行的 SQL（每歌手一个事务）==========');
  for (const blk of blocks) {
    console.log(`-- ${blk.mid}`);
    console.log(blk.sql + '\n');
  }
  console.log('========== DRY-RUN 结束（未执行任何写入）==========');
  console.log(`汇总: 待插入 ${toInsert.length}，跳过重复 ${skipped.length}，校验失败 ${failed.length}`);
  process.exit(0);
}

// ---------------- 执行：先 ALTER 补列（容忍已存在）----------------
async function runAlter() {
  const alters = [
    'ALTER TABLE singers ADD COLUMN bio TEXT;',
    'ALTER TABLE singer_songs ADD COLUMN is_representative INTEGER NOT NULL DEFAULT 0;',
  ];
  for (const a of alters) {
    const tmp = join(tmpdir(), `mwc-alter-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
    writeFileSync(tmp, a, 'utf8');
    try {
      execFileSync('npx', ['wrangler', 'd1', 'execute', 'mwc-db', LOCAL ? '--local' : '--remote', '--file=' + tmp], {
        stdio: 'ignore',
        shell: true,
        timeout: 60000,
      });
    } catch (e) {
      const msg = `${e.stderr || e.stdout || e.message || ''}`;
      if (/duplicate column/i.test(msg)) {
        console.log(`[import] 列已存在，跳过: ${a.split(' ')[3]}`);
      } else {
        console.error(`[import] ALTER 失败（继续，可能库已是最新）: ${msg.slice(0, 160)}`);
      }
    }
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

// ---------------- 逐歌手执行（每个歌手 = 一次 execute 调用 = 一个事务）----------------
// 返回 { [mid]: true/false }。某歌手语句失败仅回滚该歌手，不影响其他歌手。
function executePerSinger(blocks) {
  const result = {};
  blocks.forEach((blk, i) => {
    const tmp = join(tmpdir(), `mwc-import-${Date.now()}-${i}.sql`);
    writeFileSync(tmp, blk.sql, 'utf8');
    const args = ['wrangler', 'd1', 'execute', 'mwc-db', LOCAL ? '--local' : '--remote', '--file=' + tmp];
    process.stdout.write(`[import] [${i + 1}/${blocks.length}] ${blk.mid}... `);
    const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    let done = false;
    let success = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        execFileSync('npx', args, { encoding: 'utf8', stdio: 'pipe', shell: true, timeout: 60000 });
        if (attempt > 1) process.stdout.write(`(retry ${attempt - 1}) `);
        console.log('OK');
        success = true;
        done = true;
      } catch (e) {
        const msg = `${e.stderr || ''}${e.stdout || ''}${e.message || ''}`;
        const transient = /Authentication|import\) failed|code:\s*10000|timed out|ETIMEDOUT/i.test(msg);
        if (transient && attempt < 3) {
          console.error(`\n[import] 瞬时错误，重试 ${attempt}/3...`);
          sleep(2000);
          continue;
        }
        console.error(`\n[import] ❌ ${blk.mid} 失败: ${msg.slice(0, 200)}`);
        done = true;
      }
    }
    result[blk.mid] = success;
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  });
  return result;
}

// ---------------- 后校验：统计成功/失败 ----------------
function verifyInserted(intendedMids) {
  if (intendedMids.length === 0) return new Set();
  const inList = intendedMids.map(q).join(',');
  return queryColumnValues(
    `SELECT singer_mid FROM singers WHERE singer_mid IN (${inList});`,
    'singer_mid',
  );
}

// ---------------- 主流程 ----------------
(async () => {
  await runAlter();
  console.log(`[import] 逐歌手执行 ${blocks.length} 个事务...`);
  const perResult = executePerSinger(blocks);

  const intendedMids = toInsert.map((s) => s.mid);
  const found = verifyInserted(intendedMids);
  // 落库判定：后校验存在 且 该歌手执行未报错（双保险）
  const inserted = toInsert.filter((s) => found.has(s.mid) && perResult[s.mid]).map((s) => s.mid);
  const notInserted = toInsert.filter((s) => !(found.has(s.mid) && perResult[s.mid])).map((s) => s.mid);

  console.log('\n========== 导入结果 ==========');
  console.log(`✅ 成功插入: ${inserted.length} 条`);
  inserted.forEach((m) => console.log(`   + ${m}`));
  if (skipped.length) {
    console.log(`⏭️  跳过(重复): ${skipped.length} 条`);
    skipped.forEach((m) => console.log(`   = ${m}`));
  }
  if (notInserted.length) {
    console.log(`❌ 失败(未落库): ${notInserted.length} 条`);
    notInserted.forEach((m) => console.log(`   - ${m}`));
  }
  if (failed.length) {
    console.log(`🚫 校验失败: ${failed.length} 条`);
    failed.forEach((f) => console.log(`   x ${f.mid}: ${f.errors.join('; ')}`));
  }
  if (jsonWritten.length) {
    console.log(`📄 已写 singerData JSON: ${jsonWritten.length} 个（规范源，重迁移不丢）`);
  }
  console.log('=============================');

  if (notInserted.length) process.exit(1);
})();
