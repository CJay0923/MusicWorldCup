// scripts/cleanup-lead-artist.js
// 主唱/主专艺人清洗：剔除 filename 首位艺人 ≠ 目标歌手 的条目
//
// 背景：无论 QQ 还是酷狗管线，都会把「周杰伦作曲/配唱但非主唱」的歌（如蔡依林《海盗/骑士精神/布拉格广场》、
// 温岚《屋顶》、李玟《刀马旦》）也列进来。这些歌在酷狗原始列表里的 filename 是
// "蔡依林、周杰伦 - 海盗"，首位艺人 = 蔡依林 ≠ 周杰伦，应剔除。
//
// 匹配方式：歌名 + 专辑名（归一化），与原始管线格式无关。
//
// 用法: node scripts/cleanup-lead-artist.js [singerId...]

import { writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'src', 'data', 'singerData');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SINGERIDS = {
  jay: 3520, leehom: 2724, david: 2626, jj: 1574, khalil: 877, eason: 420,
  mayday: 8965, lironghao: 93475, stefanie: 5826, jolin: 4248, fish: 5085,
  elva: 6331, angela: 6811, cyndi: 6079, rainie: 6538, she: 8570, amei: 6809,
  gem: 4490, sandy: 5088, lala: 6335,
};
const SINGERS = {
  jay: '周杰伦', leehom: '王力宏', david: '陶喆', jj: '林俊杰', khalil: '方大同',
  eason: '陈奕迅', mayday: '五月天', lironghao: '李荣浩', stefanie: '孙燕姿',
  jolin: '蔡依林', fish: '梁静茹', elva: '萧亚轩', angela: '张韶涵', cyndi: '王心凌',
  rainie: '杨丞琳', she: 'S.H.E', amei: '张惠妹', gem: '邓紫棋', sandy: '林忆莲',
  lala: '徐佳莹',
};
const SINGER_ALIASES = { gem: ['G.E.M. 邓紫棋', 'G.E.M.'] };

function norm(s) {
  return String(s || '').normalize('NFKC').toLowerCase()
    .replace(/[([（【][^)\]）】]*[)\]）】]/g, '')
    .replace(/[\s'"、·.。，,！!？?~～@#$%^&*()（）\[\]【】{}+=|\\/;；:："'`~—–-]/g, '');
}

function leadArtist(filename) {
  const s = String(filename || '').trim();
  const dash = s.indexOf(' - ');
  if (dash < 0) return '';
  const artistPart = s.slice(0, dash).trim();
  return String(artistPart).split(/[、&＆/]/)[0].trim();
}

function leadIsTarget(filename, singerId, singerName) {
  const s = String(filename || '').trim();
  if (s.indexOf(' - ') < 0) return true; // 无前缀 → 保留
  const first = leadArtist(filename);
  if (first === singerName) return true;
  const aliases = SINGER_ALIASES[singerId] || [];
  return aliases.some((a) => first === a);
}

function extractSongName(filename) {
  const s = String(filename || '').trim();
  const m = s.match(/\s+-\s+(.+)$/);
  return m ? m[1].trim() : s;
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchKugouSongs(singerid) {
  const all = [];
  let page = 0, total = Infinity;
  while (page < 30) {
    const url = `http://mobilecdn.kugou.com/api/v3/singer/song?singerid=${singerid}&page=${page + 1}&pagesize=100&sorttype=0`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      const d = await res.json();
      const lst = d?.data?.info || [];
      total = d?.data?.total || total;
      if (!lst.length) break;
      all.push(...lst);
      if (all.length >= total) break;
    } catch { break; }
    page++;
    await sleep(120);
  }
  return all;
}

async function cleanSinger(singerId) {
  const singerid = SINGERIDS[singerId];
  const singerName = SINGERS[singerId];
  if (!singerid) { console.log(`❌ ${singerId}: 无 singerid`); return; }

  const jsonPath = join(DATA_DIR, `${singerId}.json`);
  let data;
  try { data = JSON.parse(await readFile(jsonPath, 'utf-8')); }
  catch { console.log(`❌ ${singerId}: 读取失败`); return; }

  const before = data.entrants.length;
  console.log(`\n🎤 ${singerName} (${singerId}) — 当前 ${before} 首，拉取酷狗原始列表...`);

  const raw = await fetchKugouSongs(singerid);

  // 构建「坏」集合：歌名+专辑名（归一化），命中做客他人专辑的版本
  const badKeys = new Set();
  for (const s of raw) {
    if (leadIsTarget(s.filename, singerId, singerName)) continue;
    const name = extractSongName(s.filename);
    const album = String(s.album_name || '').trim();
    badKeys.add(`${norm(name)}|${norm(album)}`);
  }

  const removed = [];
  const kept = [];
  for (const e of data.entrants) {
    const key = `${norm(e.name)}|${norm(e.albumName)}`;
    if (badKeys.has(key)) {
      removed.push(e);
    } else {
      kept.push(e);
    }
  }

  console.log(`  原始 ${raw.length} 条，坏版本 ${badKeys.size} 个；清洗: ${before} → ${kept.length} (剔除 ${removed.length})`);
  if (removed.length) {
    console.log('  剔除列表:');
    for (const e of removed) console.log(`    ✂ ${e.name} | ${e.albumName}`);
  }

  if (removed.length > 0) {
    data.entrants = kept;
    // 保留原始文件换行风格（CRLF/LF），避免无意义 diff
    const original = await readFile(jsonPath);
    const nl = original.includes('\r\n') ? '\r\n' : '\n';
    const out = JSON.stringify(data, null, 2).replace(/\n/g, nl) + nl;
    await writeFile(jsonPath, out);
    console.log(`  💾 已保存 (${kept.length} 首)`);
  }
  return { before, after: kept.length, removed: removed.length };
}

async function main() {
  const only = process.argv.slice(2);
  console.log('🧹 主唱/主专艺人清洗...\n');
  const summary = {};
  for (const singerId of Object.keys(SINGERS)) {
    if (only.length && !only.includes(singerId)) continue;
    try { summary[singerId] = await cleanSinger(singerId); }
    catch (err) { console.error(`❌ ${singerId}: ${err.message}`); }
  }
  console.log('\n📊 汇总:');
  let totalR = 0;
  for (const [id, s] of Object.entries(summary)) {
    if (s) { console.log(`  ${id}: ${s.before} → ${s.after} (剔除 ${s.removed})`); totalR += s.removed; }
  }
  console.log(`\n共剔除 ${totalR} 首`);
}

main().catch((err) => { console.error('💥', err); process.exit(1); });
