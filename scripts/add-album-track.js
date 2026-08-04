// scripts/add-album-track.js
// 为现有 src/data/singerData/*.json 回填专辑内曲序 albumTrack（1 起，主打靠前）
// 并重排 entrants：favCount 降序主序，收藏量相等时按 albumTrack 升序打断。
//
// 用法: node scripts/add-album-track.js [singerId...]
// 输出: 就地更新 src/data/singerData/{id}.json

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'src', 'data', 'singerData');

const QQ_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://y.qq.com/',
};

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 拉取专辑曲目列表，返回 songmid → albumTrack 映射
async function fetchAlbumTracks(albumMid) {
  const url =
    `https://c.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg` +
    `?albummid=${albumMid}&format=json&inCharset=utf8&outCharset=utf-8&platform=yqq`;
  try {
    const res = await fetch(url, { headers: QQ_HEADERS });
    const data = await res.json();
    const list = data?.data?.list || [];
    const map = new Map();
    list.forEach((t, i) => {
      if (t.songmid) map.set(t.songmid, i + 1);
    });
    return map;
  } catch {
    return null;
  }
}

async function processSinger(singerId, dataPath) {
  const raw = JSON.parse(await readFile(dataPath, 'utf8'));
  const entrants = raw.entrants || [];
  if (!entrants.length) {
    console.log(`${singerId}: 无曲目，跳过`);
    return;
  }

  const albumMids = [...new Set(entrants.map((e) => e.albumMid).filter(Boolean))];
  console.log(`${singerId}: ${entrants.length} 首, ${albumMids.length} 张专辑`);

  const trackMap = new Map(); // songmid → albumTrack
  let ok = 0;
  for (let i = 0; i < albumMids.length; i++) {
    const mid = albumMids[i];
    const m = await fetchAlbumTracks(mid);
    if (m) {
      for (const [songmid, idx] of m) trackMap.set(songmid, idx);
      ok++;
    }
    await sleep(120);
    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${albumMids.length}...`);
  }
  console.log(`  专辑拉取成功 ${ok}/${albumMids.length}, 曲目映射 ${trackMap.size} 条`);

  let filled = 0;
  for (const e of entrants) {
    if (e.songmid && trackMap.has(e.songmid)) {
      e.albumTrack = trackMap.get(e.songmid);
      filled++;
    } else if (e.albumTrack == null) {
      e.albumTrack = null;
    }
  }
  console.log(`  回填 albumTrack ${filled}/${entrants.length}`);

  // 重排：favCount 降序，相等时 albumTrack 升序（无曲序视为 999 排后）
  entrants.sort((a, b) => {
    const favDiff = (b.favCount || 0) - (a.favCount || 0);
    if (favDiff !== 0) return favDiff;
    const ta = a.albumTrack == null ? 999 : a.albumTrack;
    const tb = b.albumTrack == null ? 999 : b.albumTrack;
    return ta - tb;
  });

  await writeFile(dataPath, JSON.stringify(raw));
  console.log(`  ✅ 已保存 ${singerId}.json`);
  await sleep(200);
}

async function main() {
  const only = process.argv.slice(2);
  const files = (await readdir(DATA_DIR))
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .sort();
  for (const f of files) {
    const singerId = f.replace('.json', '');
    if (only.length && !only.includes(singerId)) continue;
    try {
      await processSinger(singerId, join(DATA_DIR, f));
    } catch (err) {
      console.error(`❌ ${singerId} 失败: ${err.message}`);
    }
  }
  console.log('\n✅ 全部完成');
}

main().catch((err) => {
  console.error('💥 失败:', err);
  process.exit(1);
});
