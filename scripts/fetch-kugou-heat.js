// scripts/fetch-kugou-heat.js
// 为现有 src/data/singerData/*.json 回填酷狗真实热度：
//   kugouOwnerCount  — 收藏/拥有数（真实累计值，不封顶，如晴天 314 万 vs 双刀 5 万）
//   kugouHeatLevel   — 酷狗热度等级（1-6）
// 解决 QQ favCount 封顶 1000001 导致热门歌热度无法区分的问题。
//
// 用法: node scripts/fetch-kugou-heat.js [singerId...]
// 输出: 就地更新 src/data/singerData/{id}.json（写入 kugouOwnerCount/kugouHeatLevel，
//       并按 favCount 降序 + kugouOwnerCount 降序重排 entrants）

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'src', 'data', 'singerData');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.kugou.com/',
};

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 搜索酷狗歌曲，返回命中热度的候选
// 策略：关键字「歌手名 歌名」，过滤 Live/翻唱/DJ版，
//       必须 SingerName 包含目标歌手 且 歌名归一化后一致，才作为候选
async function searchKugou(artistName, songName) {
  const keyword = encodeURIComponent(`${artistName} ${songName}`);
  const url =
    `https://songsearch.kugou.com/song_search_v2?keyword=${keyword}` +
    `&page=1&pagesize=5&platform=Android&userid=-1&clientver=2000` +
    `&tag=em&filter=2&iscorrection=1&privilege_filter=0`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    const data = await res.json();
    const lists = data?.data?.lists || [];

    // Live/翻唱/DJ 正则（与下载管线同源，简化版）
    const BAD = /live|现场|演唱|翻唱|伴奏|钢琴|纯音乐|remix|dj版|demo|串烧|乐器|演奏/i;
    const targetKey = baseKey(songName);

    const candidates = [];
    for (const t of lists) {
      const name = (t.SongName || '').replace(/<[^>]+>/g, '').trim();
      const singer = (t.SingerName || '').replace(/<[^>]+>/g, '').trim();
      // 过滤 Live/翻唱/DJ 等非原版
      if (BAD.test(name)) continue;
      // 歌手必须包含目标歌手（处理合唱歌「周杰伦、潘儿」）
      if (!singer.includes(artistName)) continue;
      // 歌名必须匹配（归一化后一致）
      if (baseKey(name) !== targetKey) continue;
      candidates.push({
        name,
        singer,
        owner: t.OwnerCount || 0,
        heat: t.HeatLevel || 0,
        publish: t.PublishDate || '',
      });
    }
    return candidates;
  } catch {
    return null;
  }
}

// 照搬 utils/text.js 的 baseKey：NFKC 归一化 + 去括号注记 + 去 " - xxx" 后缀 + 去空格标点
function baseKey(name) {
  let s = String(name).normalize('NFKC').toLowerCase();
  s = s.replace(/[([（【][^)\]）】]*[)\]）】]/g, ' ');
  s = s.split(/\s+[-–—]\s+/)[0];
  s = s.replace(/[\s''"""!！?？。，、·&+]/g, '');
  return s || String(name).toLowerCase();
}

async function processSinger(singerId, dataPath) {
  const raw = JSON.parse(await readFile(dataPath, 'utf8'));
  const entrants = raw.entrants || [];
  const artistName = raw.singerName;
  if (!entrants.length || !artistName) {
    console.log(`${singerId}: 无曲目或歌手名，跳过`);
    return;
  }

  console.log(`${singerId}: ${entrants.length} 首, 歌手「${artistName}」`);

  let hit = 0;
  const missList = [];
  for (let i = 0; i < entrants.length; i++) {
    const e = entrants[i];
    const cands = await searchKugou(artistName, e.name);
    if (cands && cands.length > 0) {
      // 候选已歌名精确匹配；多版本时取 owner 最大者
      const best = cands.reduce((a, b) => (b.owner > a.owner ? b : a));
      e.kugouOwnerCount = best.owner;
      e.kugouHeatLevel = best.heat;
      hit++;
    } else {
      e.kugouOwnerCount = null;
      e.kugouHeatLevel = null;
      missList.push(e.name);
    }
    await sleep(80);
    if ((i + 1) % 30 === 0) {
      console.log(`  ${i + 1}/${entrants.length} (命中 ${hit})...`);
    }
  }
  console.log(`  ✅ 命中 ${hit}/${entrants.length}`);
  if (missList.length > 0 && missList.length <= 15) {
    console.log(`  未命中: ${missList.join(', ')}`);
  } else if (missList.length > 15) {
    console.log(`  未命中(前15): ${missList.slice(0, 15).join(', ')}...`);
  }

  // 重排：favCount 降序主序，收藏量相等（封顶组）按 kugouOwnerCount 降序打断，
  //       无酷狗数据回退到专辑曲序（albumTrack 升序）
  entrants.sort((a, b) => {
    const favDiff = (b.favCount || 0) - (a.favCount || 0);
    if (favDiff !== 0) return favDiff;
    const ka = a.kugouOwnerCount == null ? -1 : a.kugouOwnerCount;
    const kb = b.kugouOwnerCount == null ? -1 : b.kugouOwnerCount;
    if (kb !== ka) return kb - ka;
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
