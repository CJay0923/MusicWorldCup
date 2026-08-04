// scripts/filter-instrumentals.js
// 一次性清洗：从已生成的 src/data/singerData/*.json 中剔除不适合对决的曲目，
// 包括：纯音乐（歌词接口占位文案）、Demo/抢听版/试听版、串烧合辑/翻唱致敬、
// Live/现场、伴奏/口白/Remix 等，并重新写入 JSON。
//
// 用法: node scripts/filter-instrumentals.js [singerId ...]
// 说明: 不重跑 nid / 收藏量；规则与 scripts/download-singer-data.js 保持一致。

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'src', 'data', 'singerData');

const QQ_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://y.qq.com/',
};

const PURE_INSTRUMENTAL_LYRIC =
  /此歌曲为没有填词的纯音乐|没有填词的纯音乐/i;

const LIVE_TRACK_PATTERNS = [
  /[(\[（【][^)\]）】]*(live|unplugged)[^)\]）】]*[)\]）】]/i,
  /\blive\s+(at|from|in|on|@)\b/i,
  /[-–—~]\s*live\b/i,
  /\blive\s*(version|ver\.?|session|sessions|edit|recording|album)\b/i,
  /\b(in concert|unplugged)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|音乐节|音樂節|live版|巡回|巡迴|巡演|不插电|不插電|演奏会|演奏會)/i,
];
const LIVE_ALBUM_PATTERNS = [
  /[(\[（【][^)\]）】]*(live|unplugged)[^)\]）】]*[)\]）】]/i,
  /\blive\s+(at|from|in|on|@)\b/i,
  /^live\b/i,
  /\blive!?$/i,
  /\b(in concert|unplugged|world tour)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|巡回|巡迴|巡演|不插电|不插電)/,
];
const JUNK_TRACK =
  /(\binstrumental\b|伴奏|卡拉OK|karaoke|off\s?vocal|纯音乐|純音樂|\bcommentary\b|\bvoice memo\b|口白|混音|remix|说故事|深夜私语|Mommy|^\s*(intro|outro|interlude)\s*$|\bEP\d+\b|\bdemo\b|抢听版|试听版|抢先版)/i;
const JUNK_ALBUM = /(英文日记|日记课|口白|说故事|有声书|有声剧|朗读|睡前故事|教学|Talks)/i;
const MEDLEY_TRACK = /(串烧|串燒|翻唱|致敬|\bmedley\b|\bmashup\b|\bHITS\b|[\u4e00-\u9fff]{2,}[+／/][\u4e00-\u9fff]{2,})/i;

const isLiveTrack = (n) => LIVE_TRACK_PATTERNS.some((re) => re.test(n));
const isLiveAlbum = (n) => LIVE_ALBUM_PATTERNS.some((re) => re.test(n || ''));
const isJunkTrack = (n) => JUNK_TRACK.test(n);
const isJunkAlbum = (n) => JUNK_ALBUM.test(n || '');
const isMedleyTrack = (n) => MEDLEY_TRACK.test(n);

function isNotSuitable(e) {
  const name = e.name || '';
  const album = e.albumName || '';
  return (
    isJunkTrack(name) ||
    isLiveTrack(name) ||
    isLiveAlbum(album) ||
    isJunkAlbum(album) ||
    isMedleyTrack(name)
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchSongLyric(songmid) {
  const url = `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${songmid}&format=json&nobase64=1`;
  try {
    const res = await fetch(url, { headers: QQ_HEADERS });
    const data = await res.json();
    return data?.lyric || '';
  } catch {
    return null;
  }
}

async function processFile(file) {
  const filePath = join(DATA_DIR, file);
  const data = JSON.parse(await readFile(filePath, 'utf8'));
  const entrants = data.entrants || [];
  if (!entrants.length) {
    console.log(`  ${file}: 无曲目，跳过`);
    return;
  }

  console.log(`  ${file}: 检测全部 ${entrants.length} 首...`);
  const removeIds = new Set();
  let ruleFiltered = 0;
  for (const e of entrants) {
    if (isNotSuitable(e)) {
      removeIds.add(e.songmid);
      ruleFiltered++;
      continue;
    }
    const lyric = await fetchSongLyric(e.songmid);
    if (lyric !== null && PURE_INSTRUMENTAL_LYRIC.test(lyric)) {
      removeIds.add(e.songmid);
    }
    await sleep(120);
  }

  if (!removeIds.size) {
    console.log(`  ${file}: 无需剔除的曲目`);
    return;
  }

  const before = entrants.length;
  data.entrants = entrants.filter((e) => !removeIds.has(e.songmid));
  await writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(
    `  ✅ ${file}: 剔除 ${before - data.entrants.length} 首 (规则命中 ${ruleFiltered}) → 剩 ${data.entrants.length} 首`,
  );
}

async function main() {
  const only = process.argv.slice(2);
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.json'));
  const targets = only.length
    ? files.filter((f) => only.includes(f.replace(/\.json$/, '')))
    : files;

  for (const f of targets) {
    if (f === 'index.json') continue;
    await processFile(f);
  }
  console.log('\n✅ 数据清洗完成');
}

main().catch((err) => {
  console.error('💥 清洗失败:', err);
  process.exit(1);
});
