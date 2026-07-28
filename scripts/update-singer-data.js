// scripts/update-singer-data.js
// 增量更新已有歌手数据：补充 albumType 和 favCount 字段
// 不重新获取歌曲列表/nid/图片，仅补充缺失字段
//
// 用法: node scripts/update-singer-data.js

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const QQ_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://y.qq.com/',
};

const SINGERS = {
  stefanie: { name: '孙燕姿', singermid: '001pWERg3vFgg8' },
  jj: { name: '林俊杰', singermid: '001BLpXF2DyJe2' },
  jay: { name: '周杰伦', singermid: '0025NhlN2yWrP4' },
  jolin: { name: '蔡依林', singermid: '0027pdHE4STooO' },
  david: { name: '陶喆', singermid: '002cK0F12szD9T' },
};

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 获取专辑详情（含专辑类型）
async function fetchAlbumDetail(albumMid) {
  const dataParam = JSON.stringify({
    comm: { ct: 24, cv: 0 },
    req: {
      module: 'music.musichallAlbum.AlbumInfoServer',
      method: 'GetAlbumDetail',
      param: { albumMid },
    },
  });

  const url =
    `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&loginUin=0&hostUin=0` +
    `&inCharset=utf8&outCharset=utf-8&platform=yqq.json&needNewCode=0` +
    `&data=${encodeURIComponent(dataParam)}`;

  try {
    const res = await fetch(url, { headers: QQ_HEADERS });
    const data = await res.json();
    const info = data?.req?.data?.basicInfo;
    if (!info) return null;
    return {
      mid: albumMid,
      name: info.albumName || '',
      aDate: info.publishDate || '',
      albumType: info.albumType || '',
      type: info.type || 0,
    };
  } catch {
    return null;
  }
}

// 批量获取歌曲收藏量
async function fetchSongFavCounts(songIds) {
  const result = {};
  const batchSize = 50;

  for (let i = 0; i < songIds.length; i += batchSize) {
    const batch = songIds.slice(i, i + batchSize);
    const dataParam = JSON.stringify({
      comm: { ct: 24, cv: 0 },
      req: {
        module: 'music.musicasset.SongFavRead',
        method: 'GetSongFansNumberById',
        param: { v_songId: batch },
      },
    });

    const url =
      `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&loginUin=0&hostUin=0` +
      `&inCharset=utf8&outCharset=utf-8&platform=yqq.json&needNewCode=0` +
      `&data=${encodeURIComponent(dataParam)}`;

    try {
      const res = await fetch(url, { headers: QQ_HEADERS });
      const data = await res.json();
      const numbers = data?.req?.data?.m_numbers || {};
      Object.assign(result, numbers);
    } catch (err) {
      console.warn(`  ⚠ 收藏量获取失败: ${err.message}`);
    }
    await sleep(300);
  }

  return result;
}

async function updateSinger(singerId, singerInfo) {
  const jsonPath = join(PROJECT_ROOT, 'src', 'data', 'singerData', `${singerId}.json`);
  const raw = JSON.parse(await readFile(jsonPath, 'utf-8'));

  console.log(`\n🎵 更新歌手: ${singerInfo.name} (${singerId})`);
  console.log(`  📊 现有歌曲: ${raw.entrants.length}`);

  // 检查是否已有 favCount 和 albumType
  const hasFav = raw.entrants.some((e) => e.favCount != null);
  const hasAlbumType = raw.entrants.some((e) => e.albumType != null);

  // 1. 补充 albumType
  if (!hasAlbumType) {
    const uniqueAlbumMids = new Set();
    for (const song of raw.entrants) {
      if (song.albumMid) uniqueAlbumMids.add(song.albumMid);
    }

    console.log(`  📥 获取 ${uniqueAlbumMids.size} 张专辑类型...`);
    const albumTypeMap = new Map();
    const albumDateMap = new Map();
    let count = 0;
    for (const albumMid of uniqueAlbumMids) {
      const detail = await fetchAlbumDetail(albumMid);
      if (detail) {
        albumTypeMap.set(albumMid, detail.albumType);
        if (detail.aDate) albumDateMap.set(albumMid, detail.aDate);
      }
      count++;
      if (count % 10 === 0) {
        console.log(`    已获取 ${count}/${uniqueAlbumMids.size}...`);
      }
      await sleep(150);
    }
    console.log(`  ✅ 专辑类型获取完成 (成功 ${albumTypeMap.size}/${uniqueAlbumMids.size})`);

    for (const song of raw.entrants) {
      song.albumType = albumTypeMap.get(song.albumMid) || '';
      if (!song.albumDate && albumDateMap.has(song.albumMid)) {
        song.albumDate = albumDateMap.get(song.albumMid);
      }
    }
  } else {
    console.log(`  ✅ 已有 albumType，跳过`);
  }

  // 2. 补充 favCount
  if (!hasFav) {
    const allSongIds = raw.entrants.map((s) => s.songid).filter((id) => id > 0);
    console.log(`  📥 获取 ${allSongIds.length} 首歌曲收藏量...`);
    const favMap = await fetchSongFavCounts(allSongIds);
    console.log(`  ✅ 收藏量获取完成 (${Object.keys(favMap).length}/${allSongIds.length})`);

    for (const song of raw.entrants) {
      song.favCount = favMap[song.songid] || 0;
    }
  } else {
    console.log(`  ✅ 已有 favCount，跳过`);
  }

  // 3. 保存更新后的 JSON
  await writeFile(jsonPath, JSON.stringify(raw, null, 2));
  console.log(`  💾 数据已更新: src/data/singerData/${singerId}.json`);
}

async function main() {
  console.log('🚀 开始增量更新歌手数据...\n');

  for (const [singerId, singerInfo] of Object.entries(SINGERS)) {
    try {
      await updateSinger(singerId, singerInfo);
    } catch (err) {
      console.error(`❌ 更新歌手 ${singerId} 失败: ${err.message}`);
    }
  }

  console.log('\n✅ 增量更新完成！');
}

main().catch((err) => {
  console.error('💥 更新失败:', err);
  process.exit(1);
});
