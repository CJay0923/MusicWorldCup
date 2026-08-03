// scripts/download-kugou-singer-data.js
// 用酷狗数据源预取歌手歌曲（替代 QQ 管线）
//
// 数据源：mobilecdn.kugou.com
//   1. singer/info 按名定位 singerid（邓紫棋等特殊歌手用 song_search_v2 的 SingerId）
//   2. singer/song?singerid=&sorttype=0 拉全量列表（自带酷狗热度序）
//   3. 过滤：is_original=1（保底原唱）+ Live/现场/伴奏/串烧正则 + baseKey 去重
//   4. 列表顺序即种子排序（酷狗热度序）
//   5. 下载专辑封面 / 歌手头像
//
// 输出（与 QQ 版兼容，前端零改动）:
//   src/data/singerData/{singerId}.json
//   src/data/singerData/index.json
//   public/covers/album_{album_id}.jpg
//   public/covers/singer_{singerid}.jpg
//
// 用法: node scripts/download-kugou-singer-data.js [singerId...]
// 之后需跑 scripts/fetch-itunes-previews.js 补 iTunes 试听

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'src', 'data', 'singerData');
const COVER_DIR = join(PROJECT_ROOT, 'public', 'covers');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 歌手名 → singerid（优先预置已知 id，避免按名搜索误命中）
// 邓紫棋必须用 4490（singer/info 按名搜会命中错误条目）
const SINGERIDS = {
  jay: 3520,
  leehom: 2724,
  david: 2626,
  jj: 1574,
  khalil: 877,
  eason: 420,
  mayday: 8965,
  lironghao: 93475,
  stefanie: 5826,
  jolin: 4248,
  fish: 5085,
  elva: 6331,
  angela: 6811,
  cyndi: 6079,
  rainie: 6538,
  she: 8570,
  amei: 6809,
  gem: 4490,
  sandy: 5088,
  lala: 6335,
};

const SINGERS = {
  jay: '周杰伦', leehom: '王力宏', david: '陶喆', jj: '林俊杰',
  khalil: '方大同', eason: '陈奕迅', mayday: '五月天', lironghao: '李荣浩',
  stefanie: '孙燕姿', jolin: '蔡依林', fish: '梁静茹', elva: '萧亚轩',
  angela: '张韶涵', cyndi: '王心凌', rainie: '杨丞琳', she: 'S.H.E',
  amei: '张惠妹', gem: '邓紫棋', sandy: '林忆莲', lala: '徐佳莹',
};

// ---------- 工具函数 ----------

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 兼容 QQ 管线的过滤正则
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
  /^live\b/i, /\blive!?$/i,
  /\b(in concert|unplugged|world tour)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|巡回|巡迴|巡演|不插电|不插電)/,
];
const JUNK_TRACK =
  /(\binstrumental\b|伴奏|卡拉OK|karaoke|off\s?vocal|纯音乐|純音樂|\bcommentary\b|\bvoice memo\b|口白|混音|remix|说故事|深夜私语|^\s*(intro|outro|interlude)\s*$|\bEP\d+\b|\bdemo\b|抢听版|试听版|抢先版|\bdj\b|DJ\w*版|慢摇|嗨曲|阿满收藏|翻唱|cover|音乐频道)/i;
const MEDLEY_TRACK = /(串烧|串燒|翻唱|致敬|\bmedley\b|\bmashup\b|\bHITS\b|[\u4e00-\u9fff]{2,}[+／/][\u4e00-\u9fff]{2,})/i;
// 酷狗 UGC/非正式专辑名拦截（含他人作品、合集、综艺现场、古典乐等）
const UGC_ALBUM =
  /(歌单|精选|合集|合辑|单曲合集|精选集|榜单|排行榜|风云榜|热歌|新歌榜|100首|金曲100|名曲|镇站之宝|晚会|春晚|总决赛|好声音|酷我|原创音乐人|翻唱|致敬|也许该懂事了|慢摇|舞曲|DJ|串烧|动感|汽车音乐|车载)/i;
// 歌名 UGC/再创作特征（纯音乐/3D环绕/片段等，但排除合法「纯音乐」单曲名）
const UGC_NAME = /(3D环绕|环绕版|\bDemo\b|饭制|剪辑|片段|抢鲜版|抢先版|钢琴版|四手联弹|组曲)/i;

function isLiveTrack(name) {
  return LIVE_TRACK_PATTERNS.some((re) => re.test(name));
}
function isLiveAlbum(albumName) {
  return LIVE_ALBUM_PATTERNS.some((re) => re.test(albumName || ''));
}
function isJunkTrack(name) {
  return JUNK_TRACK.test(name);
}
function isMedleyTrack(name) {
  return MEDLEY_TRACK.test(name) || /\+/.test(name);
}
function isUgcAlbum(albumName) {
  return UGC_ALBUM.test(albumName || '');
}
function isUgcName(name) {
  return UGC_NAME.test(name || '');
}

function baseKey(name) {
  let s = String(name).normalize('NFKC').toLowerCase();
  s = s.replace(/[([（【][^)\]）】]*[)\]）】]/g, ' ');
  s = s.split(/\s+[-–—]\s+/)[0];
  s = s.replace(/[\s''"""!！?？。，、·&+]/g, '');
  return s || String(name).toLowerCase();
}

// 歌名从 "歌手 - 歌名" 中提取
function extractSongName(filename) {
  const s = String(filename || '').trim();
  // 酷狗格式: "周杰伦 - 晴天" 或 "G.E.M. 邓紫棋 - 泡沫"
  const m = s.match(/\s+-\s+(.+)$/);
  return m ? m[1].trim() : s;
}

// 歌手别名（酷狗 filename 里可能用的别名 → singerId）
const SINGER_ALIASES = {
  gem: ['G.E.M. 邓紫棋', 'G.E.M.'],
};

// 判断 filename 首位艺人是否是目标歌手本人
//   格式: "artist1、artist2 - song"  → 首位艺人是主唱/主专艺人
//   若 filename 无 " - " 分隔（极罕见）→ 无法判定，保留
//   若首位艺人 ≠ 目标歌手（且非其别名）→ 这是做客他人专辑/合唱，剔除
function leadArtistMatches(filename, singerId, singerName) {
  const s = String(filename || '').trim();
  const dash = s.indexOf(' - ');
  if (dash < 0) return true; // 无前缀 → 保留
  const artistPart = s.slice(0, dash).trim();
  const firstArtist = String(artistPart).split(/[、&＆/]/)[0].trim();
  if (firstArtist === singerName) return true;
  const aliases = SINGER_ALIASES[singerId] || [];
  return aliases.some((a) => firstArtist === a);
}

// ---------- 酷狗 API ----------

async function kugouGet(url, referer) {
  const headers = { 'User-Agent': UA };
  if (referer) headers.Referer = referer;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// 拉取歌手全量歌曲（sorttype=0 热度序，分页）
async function fetchKugouSongs(singerid, onProgress) {
  const all = [];
  let page = 0;
  let total = Infinity;
  while (page < 30) {
    const url =
      `http://mobilecdn.kugou.com/api/v3/singer/song?singerid=${singerid}` +
      `&page=${page + 1}&pagesize=100&sorttype=0`;
    try {
      const d = await kugouGet(url);
      const lst = d?.data?.info || d?.data?.lists || [];
      total = d?.data?.total || total;
      if (!lst.length) break;
      all.push(...lst);
      if (all.length >= total) break;
      if (onProgress) onProgress(all.length, total);
    } catch {
      break;
    }
    page++;
    await sleep(120);
  }
  return { songs: all, total: all.length >= total ? total : all.length };
}

// 获取歌手名（singer/info）
async function fetchSingerName(singerid) {
  try {
    const d = await kugouGet(
      `http://mobilecdn.kugou.com/api/v3/singer/info?singerid=${singerid}`,
    );
    return d?.data?.singername || '';
  } catch {
    return '';
  }
}

// 拉取专辑内歌曲列表（album/song，列表顺序即专辑曲序）
async function fetchAlbumSongs(albumid) {
  try {
    const d = await kugouGet(
      `http://mobilecdn.kugou.com/api/v3/album/song?albumid=${albumid}&page=1&pagesize=200`,
      'http://www.kugou.com/',
    );
    return d?.data?.info || [];
  } catch {
    return [];
  }
}

// 获取专辑信息（album/info，intro 即专辑简介）
async function fetchAlbumInfo(albumid) {
  try {
    const d = await kugouGet(
      `http://mobilecdn.kugou.com/api/v3/album/info?albumid=${albumid}`,
      'http://www.kugou.com/',
    );
    return d?.data || null;
  } catch {
    return null;
  }
}

async function downloadImage(url, destPath) {
  if (existsSync(destPath)) return true;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, buffer);
    return true;
  } catch (err) {
    console.warn(`  ⚠ 图片下载失败: ${url} → ${err.message}`);
    return false;
  }
}

// ---------- 主流程 ----------

async function processSinger(singerId, singerName) {
  const singerid = SINGERIDS[singerId];
  if (!singerid) {
    console.error(`  ❌ 缺少 ${singerId} 的 singerid`);
    return null;
  }

  console.log(`\n📱 处理歌手: ${singerName} (${singerId}, singerid=${singerid})`);

  // 1. 拉取全量歌曲
  console.log(`  📥 拉取酷狗全量歌曲...`);
  const { songs, total } = await fetchKugouSongs(singerid, (done, t) => {
    if (done % 200 === 0) console.log(`    已拉取 ${done}/${t}...`);
  });
  console.log(`  ✅ 酷狗全量: ${songs.length} 首 (total=${total})`);

  // 2. 过滤：Live/伴奏/串烧 + 专辑归属 + UGC + is_original 兜底 + 去重
  // 关键规则：
  //   - 专辑必须真实（album_id 非 0 且 album_name 非空）→ 剔除单曲/歌单/无归属混入
  //   - 专辑名排除「歌单/精选/合集」等非正式专辑
  //   - 歌名/专辑名排除 UGC 再创作特征
  //   - is_original 兜底：酷狗语义不可靠（1/2/4/5/6/undefined 混杂），仅拦截明确非原唱
  //     且非正式专辑非 Live 的歌。正式专辑 + 非 Live 歌名 = 合法，不受 is_original 影响
  const seen = new Set();
  const filtered = [];
  let liveF = 0, junkF = 0, origF = 0, noAlbumF = 0, ugcF = 0, dupF = 0, leadF = 0;
  for (const s of songs) {
    const name = extractSongName(s.filename);
    if (!name) continue;
    if (isLiveTrack(name)) { liveF++; continue; }
    if (isJunkTrack(name)) { junkF++; continue; }
    if (isMedleyTrack(name)) { liveF++; continue; }
    if (isLiveAlbum(s.album_name)) { liveF++; continue; }
    // 主唱/主专艺人校验：filename 首位艺人必须 = 目标歌手（否则是做客他人专辑/合唱，剔除）
    if (!leadArtistMatches(s.filename, singerId, singerName)) { leadF++; continue; }
    // 专辑归属校验：album_id 为 0 / 无专辑名 → 单曲或未分类混入，剔除
    const albumId = Number(s.album_id) || 0;
    const albumName = String(s.album_name || '').trim();
    if (!albumId || !albumName) { noAlbumF++; continue; }
    // 歌单/精选/合集等非正式专辑剔除
    if (isUgcAlbum(albumName)) { ugcF++; continue; }
    // 歌名 UGC 再创作特征剔除
    if (isUgcName(name)) { ugcF++; continue; }
    // 非原唱兜底：is_original 语义复杂（1/2/4/10 可为正式版，5/6/9 多为现场/影视版/非原唱）
    //   - is_original=1 放行
    //   - is_original=2/4/10 且歌名非 Live → 放行（如「听见下雨的声音」is_original=2 也是合法正式版）
    //   - is_original=5/6/9 或其他值 → 拦截（现场/影视版/非原唱/垃圾）
    const isOrig = s.trans_param?.is_original;
    if (isOrig !== undefined) {
      const ov = Number(isOrig);
      if (ov !== 1 && !(ov === 2 || ov === 4 || ov === 10) && !isLiveTrack(name)) { origF++; continue; }
    }
    const key = baseKey(name);
    if (seen.has(key)) { dupF++; continue; }
    seen.add(key);
    filtered.push(s);
  }
  console.log(
    `  ✅ 过滤后: ${filtered.length} 首 (Live/现场 ${liveF}, 垃圾 ${junkF}, 无专辑归属 ${noAlbumF}, UGC ${ugcF}, 非原唱 ${origF}, 做客他人 ${leadF}, 去重 ${dupF})`,
  );

  // 3. 下载歌手头像
  const singerInfo = await fetchSingerName(singerid);
  const singerPhotoFile = await getPhotoPath(singerid);
  let singerPhotoPath = '';
  if (singerPhotoFile) {
    singerPhotoPath = `/covers/singer_${singerid}.jpg`;
    const ok = await downloadImage(
      `http://singerimg.kugou.com/uploadpic/softhead/400/${singerPhotoFile}`,
      join(COVER_DIR, `singer_${singerid}.jpg`),
    );
    if (!ok) singerPhotoPath = '';
  }
  console.log(`  📥 下载歌手头像...`);

  // 4. 构建输出（列表顺序 = 酷狗热度序 = 种子排序）
  const entrants = filtered.map((s, i) => {
    const albumId = String(s.album_id || '');
    const cover = s.trans_param?.union_cover || '';
    return {
      name: extractSongName(s.filename),
      songmid: s.hash || '',          // 酷狗 hash（试听仍走 iTunes，songmid 仅兜底）
      songid: Number(s.audio_id) || 0,
      pic: albumId ? `/covers/album_${albumId}.jpg` : '',
      picKugou: cover ? cover.replace('{size}', '400') : '',  // 封面 CDN 直链
      albumMid: albumId,
      albumName: s.album_name || '',
      albumDate: s.publish_date || '',
      albumType: '',
      albumTrack: s.track || null,
      nid: null,
      favCount: 0,
      kugouOwnerCount: s.OwnerCount || s.owner || 0,
      kugouHeatLevel: s.HeatLevel || s.heat || 0,
    };
  });

  // 5. 下载专辑封面
  console.log(`  📥 下载专辑封面...`);
  let coverOk = 0;
  for (const e of entrants) {
    if (!e.picKugou) continue;
    const ok = await downloadImage(
      e.picKugou,
      join(COVER_DIR, `album_${e.albumMid}.jpg`),
    );
    if (ok) coverOk++;
  }
  console.log(`  ✅ 封面下载 ${coverOk} 张`);

  // 6. 补全专辑信息：曲序(albumTrack) + 简介(albumDescs)
  // 酷狗 album/song 接口列表顺序即专辑曲序（trans_param.sort）；album/info 的 intro 即专辑简介
  console.log(`  📥 补全专辑信息（曲序+简介）...`);
  const albumSet = new Set(entrants.map((e) => e.albumMid).filter(Boolean));
  const albumTrackByAudioId = new Map(); // audio_id -> track 序号
  const albumDescs = {};
  let trackOk = 0, descOk = 0;
  for (const albumId of albumSet) {
    try {
      const tracks = await fetchAlbumSongs(albumId);
      if (tracks.length) {
        tracks.forEach((t, idx) => {
          if (t.audio_id) albumTrackByAudioId.set(Number(t.audio_id), idx + 1);
        });
        trackOk++;
      }
      await sleep(60);
      const info = await fetchAlbumInfo(albumId);
      if (info) {
        const intro = String(info.intro || '').trim();
        if (intro) {
          albumDescs[String(albumId)] = intro;
          descOk++;
        }
        // 用专辑接口的 publishtime 回填更准的日期
        if (info.publishtime) {
          const pt = String(info.publishtime).trim();
          for (const e of entrants) {
            if (e.albumMid === String(albumId) && (!e.albumDate || pt.length >= 4)) {
              e.albumDate = pt;
            }
          }
        }
      }
      await sleep(60);
    } catch {
      // 单张专辑失败不阻塞
    }
  }
  for (const e of entrants) {
    if (e.songid && albumTrackByAudioId.has(Number(e.songid))) {
      e.albumTrack = albumTrackByAudioId.get(Number(e.songid));
    }
  }
  console.log(`  ✅ 专辑信息补全: 曲序 ${trackOk} 张, 简介 ${descOk} 张`);

  const output = {
    singerid,
    singerName: singerInfo || singerName,
    singerPhoto: singerPhotoPath,
    source: 'kugou',
    preprocessed: true,
    albumDescs,
    entrants,
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    join(DATA_DIR, `${singerId}.json`),
    JSON.stringify(output, null, 2),
  );
  console.log(`  💾 已保存: src/data/singerData/${singerId}.json`);

  return { songCount: entrants.length, total };
}

// 从 singer/info 获取头像文件名
async function getPhotoPath(singerid) {
  try {
    const d = await kugouGet(
      `http://mobilecdn.kugou.com/api/v3/singer/info?singerid=${singerid}`,
    );
    const img = d?.data?.imgurl || '';
    const m = img.match(/softhead\/(?:{[^}]*}\/)?([^/]+\.jpg)$/);
    return m ? m[1] : '';
  } catch {
    return '';
  }
}

async function main() {
  console.log('🚀 开始预取酷狗歌手数据...\n');

  await mkdir(COVER_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  const only = process.argv.slice(2);
  const summary = {};

  for (const [singerId, singerName] of Object.entries(SINGERS)) {
    if (only.length && !only.includes(singerId)) continue;
    try {
      const result = await processSinger(singerId, singerName);
      summary[singerId] = result;
    } catch (err) {
      console.error(`❌ 处理 ${singerId} 失败: ${err.message}`);
      summary[singerId] = { error: err.message };
    }
  }

  // 汇总
  await writeFile(
    join(DATA_DIR, 'index.json'),
    JSON.stringify(summary, null, 2),
  );
  console.log('\n📊 汇总:');
  for (const [id, s] of Object.entries(summary)) {
    if (s.error) console.log(`  ${id}: ❌ ${s.error}`);
    else console.log(`  ${id}: ${s.songCount} 首 (酷狗 total ${s.total})`);
  }
  console.log('\n✅ 完成！记得跑: node scripts/fetch-itunes-previews.js 补 iTunes 试听');
}

main().catch((err) => {
  console.error('💥 失败:', err);
  process.exit(1);
});
