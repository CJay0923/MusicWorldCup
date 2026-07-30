// 改进版 iTunes 预取脚本 - 专门针对未匹配歌曲进行二次搜索
// 改进点：
// 1. 增加 hk/jp 商店（覆盖粤语歌曲）
// 2. 对未匹配歌曲使用直接搜索（song name + artist name）
// 3. 使用模糊匹配（去除括号后缀、feat. 等）
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';
import { baseKey } from '../src/utils/text.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'public', 'singerData');
const ITUNES_BASE = 'https://itunes.apple.com';

const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' });
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

function toSimplified(s) { return t2s(String(s || '')); }
function toTraditional(s) { return s2t(String(s || '')); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function itunesGet(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('http ' + res.status);
    return await res.json();
  } catch {
    await sleep(1000);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}

function cleanSongName(name) {
  return String(name || '')
    .replace(/\s*[(\[（【].*?[)\]）】]\s*/g, '')
    .replace(/\s*feat\..*$/i, '')
    .replace(/\s*-\s*(live|demo|remix|acoustic).*$/i, '')
    .trim();
}

async function searchArtist(artistName) {
  const variants = [artistName, toTraditional(artistName), toSimplified(artistName)];
  const stores = ['cn', 'tw', 'hk', 'jp', 'us'];
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
  const stores = ['cn', 'tw', 'hk', 'jp', 'us'];
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

async function searchSongDirectly(artistName, songName, artistId) {
  const stores = ['cn', 'tw', 'hk', 'us'];
  const songKey = baseKey(toSimplified(songName));
  const cleanName = cleanSongName(songName);
  const cleanKey = baseKey(toSimplified(cleanName));

  const searchTerms = [
    `${songName} ${artistName}`,
    `${cleanName} ${artistName}`,
    `${toTraditional(songName)} ${toTraditional(artistName)}`,
  ];

  for (const term of searchTerms) {
    for (const store of stores) {
      try {
        const url = `${ITUNES_BASE}/search?term=${encodeURIComponent(term)}&entity=song&limit=25&country=${store}`;
        const data = await itunesGet(url);
        if (!data?.results) continue;

        for (const t of data.results) {
          if (t.kind !== 'song' || !t.previewUrl) continue;
          if (artistId && t.artistId !== artistId) continue;

          const tKey = baseKey(toSimplified(t.trackName));
          if (tKey === songKey) {
            return { preview: t.previewUrl, trackUrl: t.trackViewUrl || '', trackId: t.trackId || 0 };
          }
          const tCleanKey = baseKey(toSimplified(cleanSongName(t.trackName)));
          if (tCleanKey === cleanKey && cleanKey) {
            return { preview: t.previewUrl, trackUrl: t.trackViewUrl || '', trackId: t.trackId || 0 };
          }
        }
      } catch { /* try next */ }
    }
  }

  return null;
}

const SINGERS = ['stefanie', 'jj', 'jay', 'jolin', 'david', 'she', 'eason', 'amei', 'angela', 'cyndi', 'elva', 'fish', 'gem', 'khalil', 'lala', 'leehom', 'lironghao', 'mayday', 'rainie', 'sandy'];

async function main() {
  console.log('🎵 改进版 iTunes 预取（针对未匹配歌曲）...\n');

  for (const singerId of SINGERS) {
    const jsonPath = join(DATA_DIR, `${singerId}.json`);
    const raw = JSON.parse(await readFile(jsonPath, 'utf-8'));
    const singerName = raw.singerName;

    const unmatched = raw.entrants.filter(e => !e.itunesPreviewUrl);
    if (unmatched.length === 0) {
      console.log(`✅ ${singerName}: 全部已匹配，跳过`);
      continue;
    }

    console.log(`\n📱 ${singerName} (${singerId}): ${unmatched.length} 首未匹配`);

    const artist = await searchArtist(singerName);
    if (!artist) {
      console.log(`  ⚠ 未找到 iTunes 歌手，跳过`);
      continue;
    }
    console.log(`  🎤 iTunes 歌手: ${artist.name} (id=${artist.id})`);

    const tracks = await fetchArtistSongs(artist);
    console.log(`  📥 iTunes 歌曲数: ${tracks.length}`);

    // 构建扩展索引（原始 key + 清理后 key）
    const index = new Map();
    for (const t of tracks) {
      if (!t.trackName || !t.previewUrl) continue;
      const key = baseKey(toSimplified(t.trackName));
      if (!index.has(key)) {
        index.set(key, { preview: t.previewUrl, trackUrl: t.trackViewUrl || '', trackId: t.trackId || 0 });
      }
      const cleanKey = baseKey(toSimplified(cleanSongName(t.trackName)));
      if (cleanKey && !index.has(cleanKey)) {
        index.set(cleanKey, { preview: t.previewUrl, trackUrl: t.trackViewUrl || '', trackId: t.trackId || 0 });
      }
    }
    console.log(`  📇 索引大小: ${index.size}`);

    // 第一轮：扩展索引匹配
    let round1Matched = 0;
    const stillUnmatched = [];
    for (const song of unmatched) {
      const key = baseKey(toSimplified(song.name));
      const cleanKey2 = baseKey(toSimplified(cleanSongName(song.name)));
      const hit = index.get(key) || index.get(cleanKey2);
      if (hit) {
        song.itunesPreviewUrl = hit.preview;
        song.itunesTrackUrl = hit.trackUrl;
        song.itunesTrackId = hit.trackId;
        round1Matched++;
      } else {
        stillUnmatched.push(song);
      }
    }
    console.log(`  ✅ 第一轮（索引匹配）: +${round1Matched} 首`);

    // 第二轮：直接搜索（限制数量）
    const DIRECT_SEARCH_LIMIT = 50;
    const toSearch = stillUnmatched.slice(0, DIRECT_SEARCH_LIMIT);
    let round2Matched = 0;

    if (toSearch.length > 0) {
      console.log(`  🔍 第二轮（直接搜索）: 搜索 ${toSearch.length} 首...`);
      for (let i = 0; i < toSearch.length; i++) {
        const song = toSearch[i];
        const result = await searchSongDirectly(singerName, song.name, artist.id);
        if (result) {
          song.itunesPreviewUrl = result.preview;
          song.itunesTrackUrl = result.trackUrl;
          song.itunesTrackId = result.trackId;
          round2Matched++;
        }
        if ((i + 1) % 10 === 0) {
          console.log(`    进度: ${i + 1}/${toSearch.length} (匹配 ${round2Matched})`);
        }
        await sleep(200);
      }
    }

    const totalWithPreview = raw.entrants.filter(e => e.itunesPreviewUrl).length;
    const totalRate = (totalWithPreview / raw.entrants.length * 100).toFixed(1);
    console.log(`  📊 最终: ${totalWithPreview}/${raw.entrants.length} (${totalRate}%)`);
    console.log(`     第一轮 +${round1Matched}, 第二轮 +${round2Matched}`);

    await writeFile(jsonPath, JSON.stringify(raw));
    console.log(`  💾 已保存`);

    await sleep(500);
  }

  console.log('\n✅ 全部完成！');
}

main().catch(err => {
  console.error('💥 失败:', err);
  process.exit(1);
});
