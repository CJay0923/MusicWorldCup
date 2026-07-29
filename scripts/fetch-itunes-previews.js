// scripts/fetch-itunes-previews.js
// 为所有歌手的每首歌预匹配 iTunes 30 秒试听片段
// 照搬 music-cup api.js 的策略：
//   1. searchArtists(artistName) → 拿到 iTunes artistId（多商店+简繁转换）
//   2. lookup?id=artistId&entity=song → 拿到该歌手全部歌曲（cn+tw 双商店）
//   3. 用 baseKey(trackName) === baseKey(songName) 精确匹配（简繁转换后比较）
//   4. 过滤 Live/伴奏，去重
// 输出：在 singerData/{id}.json 的每首 entrant 上追加：
//   itunesPreviewUrl, itunesTrackUrl, itunesTrackId

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';
import { baseKey } from '../src/utils/text.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'public', 'singerData');

const ITUNES_BASE = 'https://itunes.apple.com';

// 简繁转换器
const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' }); // 简体 → 繁体
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' }); // 繁体 → 简体

// 统一转为简体用于比较
function toSimplified(s) {
  return t2s(String(s || ''));
}
function toTraditional(s) {
  return s2t(String(s || ''));
}

function cleanAlbum(a) {
  return String(a || '').replace(/ - (Single|EP)$/i, '');
}

const LIVE_TRACK = [
  /[(\[（【][^)\]）】]*(live|unplugged)[^)\]）】]*[)\]）】]/i,
  /\blive\s+(at|from|in|on|@)\b/i,
  /[-–—~]\s*live\b/i,
  /\blive\s*(version|ver\.?|session|sessions|edit|recording|album)\b/i,
  /\b(in concert|unplugged)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|音乐节|音樂節|live版|巡回|巡迴|巡演|不插电|不插電|演奏会|演奏會)/i,
];
const LIVE_ALBUM = [
  /[(\[（【][^)\]）】]*(live|unplugged)[^)\]）】]*[)\]）】]/i,
  /\blive\s+(at|from|in|on|@)\b/i,
  /^live\b/i, /\blive!?$/i,
  /\b(in concert|unplugged|world tour)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|巡回|巡迴|巡演|不插电|不插電)/,
];
const JUNK_TRACK = /(\binstrumental\b|伴奏|卡拉OK|karaoke|off\s?vocal|纯音乐|純音樂|\bcommentary\b|\bvoice memo\b)/i;

function isLive(name, album) {
  const al = cleanAlbum(album);
  return LIVE_TRACK.some(re => re.test(name)) || LIVE_ALBUM.some(re => re.test(al));
}
function isJunk(name) { return JUNK_TRACK.test(name); }

// ---------- iTunes API（Node 端）----------

async function itunesGet(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('http ' + res.status);
    return await res.json();
  } catch (e) {
    await sleep(1000);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('http ' + res.status);
      return await res.json();
    } catch {
      return null;
    }
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Step 1: 搜索歌手，拿到 artistId
// 策略：用简体和繁体两种形式搜索，跨 cn/tw/us/hk 四个商店
async function searchArtist(artistName) {
  const variants = [artistName, toTraditional(artistName), toSimplified(artistName)];
  const stores = ['cn', 'tw', 'us', 'hk'];
  const seen = new Set();
  const candidates = [];

  for (const variant of variants) {
    for (const store of stores) {
      const url = `${ITUNES_BASE}/search?term=${encodeURIComponent(variant)}&entity=musicArtist&limit=10&country=${store}`;
      const data = await itunesGet(url);
      if (!data?.results) continue;

      for (const a of data.results) {
        if (!a.artistId || seen.has(a.artistId)) continue;
        seen.add(a.artistId);

        // 统一转简体后比较
        const aNameSimp = toSimplified(a.artistName).toLowerCase();
        const targetSimp = toSimplified(artistName).toLowerCase();

        // 精确匹配（简繁统一后）
        let score = 0;
        if (aNameSimp === targetSimp) score = 100;
        else if (aNameSimp.includes(targetSimp) || targetSimp.includes(aNameSimp)) score = 80;
        else continue; // 不匹配就跳过

        candidates.push({ id: a.artistId, name: a.artistName, store, score });
      }
    }
  }

  // 按分数排序，取最佳
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

// Step 2: 拉取该歌手在 iTunes 上的全部歌曲（跨 cn+tw+us 商店，分页拉取）
// iTunes API limit=200，歌手歌曲数超过 200 时需用 offset 分页
async function fetchArtistSongs(artist) {
  const stores = ['cn', 'tw', 'us'];
  const seenId = new Set();
  const all = [];
  const LIMIT = 200;
  const MAX_PAGES = 10; // 安全上限：2000 首

  for (const store of stores) {
    // 主来源：search + attribute=artistTerm（分页）
    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * LIMIT;
      const searchUrl = `${ITUNES_BASE}/search?term=${encodeURIComponent(artist.name)}&entity=song&attribute=artistTerm&limit=${LIMIT}&offset=${offset}&country=${store}`;
      const data = await itunesGet(searchUrl);
      if (!data?.results) break;

      const tracks = data.results.filter(t => t.kind === 'song' && t.artistId === artist.id);
      for (const t of tracks) {
        if (!t.trackId || seenId.has(t.trackId)) continue;
        seenId.add(t.trackId);
        all.push(t);
      }

      // 返回结果不足一页 → 已到末尾
      if (data.results.length < LIMIT) break;
      await sleep(300); // 避免 API 限流
    }

    // 补充来源：lookup by artistId（分页）
    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * LIMIT;
      const lookupUrl = `${ITUNES_BASE}/lookup?id=${artist.id}&entity=song&limit=${LIMIT}&offset=${offset}&country=${store}`;
      const data = await itunesGet(lookupUrl);
      if (!data?.results) break;

      // lookup 返回的首条是 artist 对象，需过滤
      const tracks = data.results.filter(t => t.kind === 'song');
      for (const t of tracks) {
        if (!t.trackId || seenId.has(t.trackId)) continue;
        seenId.add(t.trackId);
        all.push(t);
      }

      // lookup 含 artist 对象，结果数 ≤ limit 时已到末尾
      if (data.results.length < LIMIT) break;
      await sleep(300);
    }
  }

  return all;
}

// Step 3: 构建 baseKey → iTunes track 映射（过滤 Live/伴奏，简繁统一后去重）
function buildITunesIndex(tracks) {
  const index = new Map();
  for (const t of tracks) {
    if (!t.trackName) continue;
    if (isLive(t.trackName, t.collectionName)) continue;
    if (isJunk(t.trackName)) continue;

    // 统一转简体后再算 baseKey，确保简繁一致的歌名能匹配
    const key = baseKey(toSimplified(t.trackName));

    // 优先保留有 previewUrl 的
    if (!index.has(key) || (t.previewUrl && !index.get(key).previewUrl)) {
      index.set(key, {
        preview: t.previewUrl || '',
        trackUrl: t.trackViewUrl || '',
        trackId: t.trackId || 0,
        trackName: t.trackName,
        collectionName: t.collectionName || '',
      });
    }
  }
  return index;
}

// ---------- 主流程 ----------

const SINGERS = ['stefanie', 'jj', 'jay', 'jolin', 'david', 'she', 'eason', 'amei', 'angela', 'cyndi', 'elva', 'fish', 'gem', 'khalil', 'lala', 'leehom', 'lironghao', 'mayday', 'rainie', 'sandy'];

async function main() {
  console.log('🎵 开始预取 iTunes 试听数据（含简繁转换）...\n');

  for (const singerId of SINGERS) {
    const jsonPath = join(DATA_DIR, `${singerId}.json`);
    const raw = JSON.parse(await readFile(jsonPath, 'utf-8'));
    const singerName = raw.singerName;

    console.log(`\n📱 处理歌手: ${singerName} (${singerId})`);
    console.log(`  共 ${raw.entrants.length} 首歌曲`);

    // Step 1: 搜索歌手
    console.log(`  🔍 搜索 iTunes 歌手...`);
    const artist = await searchArtist(singerName);
    if (!artist) {
      console.log(`  ⚠ 未找到 iTunes 歌手，跳过`);
      continue;
    }
    console.log(`  ✅ 找到: ${artist.name} (id=${artist.id}, store=${artist.store})`);

    // Step 2: 拉取全部歌曲（跨商店）
    console.log(`  📥 拉取 iTunes 歌曲列表...`);
    const tracks = await fetchArtistSongs(artist);
    console.log(`  ✅ 获取到 ${tracks.length} 首 iTunes 歌曲`);

    // Step 3: 构建索引
    const index = buildITunesIndex(tracks);
    console.log(`  ✅ 索引构建完成 (${index.size} 首有效歌曲)`);

    // Step 4: 匹配本地歌曲（本地歌名转简体后匹配）
    let matched = 0;
    let unmatched = 0;
    const unmatchedNames = [];

    for (const song of raw.entrants) {
      // 本地歌名也统一转简体后算 baseKey
      const key = baseKey(toSimplified(song.name));
      const hit = index.get(key);
      if (hit) {
        song.itunesPreviewUrl = hit.preview;
        song.itunesTrackUrl = hit.trackUrl;
        song.itunesTrackId = hit.trackId;
        if (hit.preview) matched++;
        else { unmatched++; unmatchedNames.push(song.name); }
      } else {
        song.itunesPreviewUrl = '';
        song.itunesTrackUrl = '';
        song.itunesTrackId = 0;
        unmatched++;
        unmatchedNames.push(song.name);
      }
    }

    console.log(`  ✅ 匹配成功: ${matched} 首, 未匹配: ${unmatched} 首`);
    if (unmatchedNames.length > 0 && unmatchedNames.length <= 20) {
      console.log(`  未匹配歌曲: ${unmatchedNames.join(', ')}`);
    } else if (unmatchedNames.length > 20) {
      console.log(`  未匹配歌曲(前20): ${unmatchedNames.slice(0, 20).join(', ')}...`);
    }

    // 保存（紧凑格式，与优化后的 JSON 保持一致）
    await writeFile(jsonPath, JSON.stringify(raw));
    console.log(`  💾 已保存: public/singerData/${singerId}.json`);

    await sleep(500);
  }

  console.log('\n✅ 全部完成！');
}

main().catch(err => {
  console.error('💥 失败:', err);
  process.exit(1);
});
