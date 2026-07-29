// 只预取覆盖率为0的11个歌手
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';
import { baseKey } from '/workspace/stefanie-song-worldcup-react/src/utils/text.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = '/workspace/stefanie-song-worldcup-react';
const DATA_DIR = join(PROJECT_ROOT, 'public', 'singerData');
const ITUNES_BASE = 'https://itunes.apple.com';

const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' });
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

function toSimplified(s) { return t2s(String(s || '')); }
function toTraditional(s) { return s2t(String(s || '')); }
function cleanAlbum(a) { return String(a || '').replace(/ - (Single|EP)$/i, ''); }

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
    } catch { return null; }
  }
}
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
        const aNameSimp = toSimplified(a.artistName).toLowerCase();
        const targetSimp = toSimplified(artistName).toLowerCase();
        let score = 0;
        if (aNameSimp === targetSimp) score = 100;
        else if (aNameSimp.includes(targetSimp) || targetSimp.includes(aNameSimp)) score = 80;
        else continue;
        candidates.push({ id: a.artistId, name: a.artistName, store, score });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

async function fetchArtistSongs(artist) {
  const stores = ['cn', 'tw', 'us'];
  const seenId = new Set();
  const all = [];
  const LIMIT = 200;
  const MAX_PAGES = 10;
  for (const store of stores) {
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
      if (data.results.length < LIMIT) break;
      await sleep(300);
    }
    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * LIMIT;
      const lookupUrl = `${ITUNES_BASE}/lookup?id=${artist.id}&entity=song&limit=${LIMIT}&offset=${offset}&country=${store}`;
      const data = await itunesGet(lookupUrl);
      if (!data?.results) break;
      const tracks = data.results.filter(t => t.kind === 'song');
      for (const t of tracks) {
        if (!t.trackId || seenId.has(t.trackId)) continue;
        seenId.add(t.trackId);
        all.push(t);
      }
      if (data.results.length < LIMIT) break;
      await sleep(300);
    }
  }
  return all;
}

function buildITunesIndex(tracks) {
  const index = new Map();
  for (const t of tracks) {
    if (!t.trackName) continue;
    if (isLive(t.trackName, t.collectionName)) continue;
    if (isJunk(t.trackName)) continue;
    const key = baseKey(toSimplified(t.trackName));
    if (!index.has(key) || (t.previewUrl && !index.get(key).preview)) {
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

const REMAINING_SINGERS = ['cyndi', 'elva', 'fish', 'gem', 'khalil', 'lala', 'leehom', 'lironghao', 'mayday', 'rainie', 'sandy'];

async function main() {
  console.log('🎵 开始预取剩余11位歌手的 iTunes 试听数据...\n');
  for (const singerId of REMAINING_SINGERS) {
    const jsonPath = join(DATA_DIR, `${singerId}.json`);
    const raw = JSON.parse(await readFile(jsonPath, 'utf-8'));
    const singerName = raw.singerName;
    console.log(`\n📱 处理歌手: ${singerName} (${singerId})`);
    console.log(`  共 ${raw.entrants.length} 首歌曲`);
    console.log(`  🔍 搜索 iTunes 歌手...`);
    const artist = await searchArtist(singerName);
    if (!artist) {
      console.log(`  ⚠ 未找到 iTunes 歌手，跳过`);
      continue;
    }
    console.log(`  ✅ 找到: ${artist.name} (id=${artist.id}, store=${artist.store})`);
    console.log(`  📥 拉取 iTunes 歌曲列表...`);
    const tracks = await fetchArtistSongs(artist);
    console.log(`  ✅ 获取到 ${tracks.length} 首 iTunes 歌曲`);
    const index = buildITunesIndex(tracks);
    console.log(`  ✅ 索引构建完成 (${index.size} 首有效歌曲)`);
    let matched = 0;
    let unmatched = 0;
    const unmatchedNames = [];
    for (const song of raw.entrants) {
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
    await writeFile(jsonPath, JSON.stringify(raw));
    console.log(`  💾 已保存: public/singerData/${singerId}.json`);
    await sleep(500);
  }
  console.log('\n✅ 全部完成！');
}

main().catch(err => { console.error('💥 失败:', err); process.exit(1); });
