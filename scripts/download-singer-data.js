// scripts/download-singer-data.js
// 一次性预取所有歌手的 QQ 音乐数据到本地
// 包括：歌曲列表、专辑发行日期、专辑封面图片、歌手头像
//       网易云 nid（音频试听）、收藏量（种子排序）、专辑类型（过滤）
//
// 用法: node scripts/download-singer-data.js
// 输出:
//   src/data/singerData/{singerId}.json  — 歌曲数据
//   src/data/singerData/index.json       — 汇总信息
//   public/covers/album_{albumMid}.jpg   — 专辑封面
//   public/covers/singer_{singermid}.jpg — 歌手头像

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const QQ_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://y.qq.com/',
};

const NETEASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com',
};

const SINGERS = {
  // 男歌手：周王陶林 + 方大同 + 陈奕迅 + 五月天 + 李荣浩
  jay: { name: '周杰伦', singermid: '0025NhlN2yWrP4' },
  leehom: { name: '王力宏', singermid: '001JDzPT3JdvqK' },
  david: { name: '陶喆', singermid: '002cK0F12szD9T' },
  jj: { name: '林俊杰', singermid: '001BLpXF2DyJe2' },
  khalil: { name: '方大同', singermid: '003zHcYF44FVEV' },
  eason: { name: '陈奕迅', singermid: '003Nz2So3XXYek' },
  mayday: { name: '五月天', singermid: '000Sp0Bz4JXH0o' },
  lironghao: { name: '李荣浩', singermid: '000aHmbL2aPXWH' },
  // 女歌手：四大三小 + SHE + 张惠妹 + 邓紫棋
  stefanie: { name: '孙燕姿', singermid: '001pWERg3vFgg8' },
  jolin: { name: '蔡依林', singermid: '0027pdHE4STooO' },
  fish: { name: '梁静茹', singermid: '000GGDys0yA0Nk' },
  elva: { name: '萧亚轩', singermid: '002tkdEU4gLVqO' },
  angela: { name: '张韶涵', singermid: '002raUWw3PXdkT' },
  cyndi: { name: '王心凌', singermid: '003RVAdJ1YT5AI' },
  rainie: { name: '杨丞琳', singermid: '000ZVS6E1f6f0d' },
  she: { name: 'S.H.E', singermid: '003u5H9x1vACGo' },
  amei: { name: '张惠妹', singermid: '003JGrNQ3RjelA' },
  gem: { name: '邓紫棋', singermid: '001fNHEf1SFEFN' },
  // 实力派女歌手
  sandy: { name: '林忆莲', singermid: '002u0TJy47WWOj' },
  lala: { name: '徐佳莹', singermid: '002LZVMH0zc8F4' },
};

// ---------- 工具函数 ----------

// 照搬 music-cup api.js 的 Live/伴奏过滤正则
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
// 垃圾曲目：伴奏/卡拉OK/纯音乐/口白/播客/Remix/Intro-Outro/Demo 等非正式歌曲
const JUNK_TRACK =
  /(\binstrumental\b|伴奏|卡拉OK|karaoke|off\s?vocal|纯音乐|純音樂|\bcommentary\b|\bvoice memo\b|口白|混音|remix|说故事|深夜私语|Mommy|^\s*(intro|outro|interlude)\s*$|\bEP\d+\b|\bdemo\b|抢听版|试听版|抢先版)/i;
// 垃圾专辑：口白教学/有声书/播客/日记等
const JUNK_ALBUM = /(英文日记|日记课|口白|说故事|有声书|有声剧|朗读|睡前故事|教学|Talks)/i;
const MEDLEY_TRACK = /(串烧|串燒|翻唱|致敬|\bmedley\b|\bmashup\b|\bHITS\b|[\u4e00-\u9fff]{2,}[+／/][\u4e00-\u9fff]{2,})/i;
// 纯音乐：QQ 歌词接口对无填词曲目返回固定占位文案
const PURE_INSTRUMENTAL_LYRIC =
  /此歌曲为没有填词的纯音乐|没有填词的纯音乐/i;

function isLiveTrack(name) {
  return LIVE_TRACK_PATTERNS.some((re) => re.test(name));
}
function isLiveAlbum(albumName) {
  return LIVE_ALBUM_PATTERNS.some((re) => re.test(albumName || ''));
}
function isJunkTrack(name) {
  return JUNK_TRACK.test(name);
}
function isJunkAlbum(albumName) {
  return JUNK_ALBUM.test(albumName || '');
}
// 专辑类型过滤：口白/播客 → 人声音频；演唱会 → 现场专辑
const JUNK_ALBUM_TYPES = ['人声音频', '现场专辑'];
// 现场串烧/翻唱：含 + 号拼接多曲、串烧/翻唱/致敬 关键词
function isMedleyTrack(name) {
  return MEDLEY_TRACK.test(name) || /\+/.test(name);
}

// 照搬 music-cup baseKey：NFKC 归一化 + 去括号注记 + 去 " - xxx" 后缀 + 去空格标点
function baseKey(name) {
  let s = String(name).normalize('NFKC').toLowerCase();
  s = s.replace(/[([（【][^)\]）】]*[)\]）】]/g, ' ');
  s = s.split(/\s+[-–—]\s+/)[0];
  s = s.replace(/[\s''"""!！?？。，、·&+]/g, '');
  return s || String(name).toLowerCase();
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadImage(url, destPath) {
  if (existsSync(destPath)) return; // 已下载则跳过
  try {
    const res = await fetch(url, { headers: QQ_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, buffer);
  } catch (err) {
    console.warn(`  ⚠ 图片下载失败: ${url} → ${err.message}`);
  }
}

// ---------- QQ 音乐 API ----------

// 获取歌手歌曲列表（sort:2 按专辑排序，用于发现全部专辑）
async function fetchSingerSongs(singermid) {
  const allSongs = [];
  const perPage = 50;
  let page = 0;
  let seen = new Set();
  let totalSong = 0;
  let singerName = '';

  while (page < 30) {
    const dataParam = JSON.stringify({
      comm: { ct: 24, cv: 0 },
      singer: {
        method: 'get_singer_detail_info',
        module: 'music.web_singer_info_svr',
        param: { sort: 2, singermid, sin: page * perPage, num: perPage },
      },
    });

    const url =
      `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&loginUin=0&hostUin=0` +
      `&inCharset=utf8&outCharset=utf-8&platform=yqq.json&needNewCode=0` +
      `&data=${encodeURIComponent(dataParam)}`;

    try {
      const res = await fetch(url, { headers: QQ_HEADERS });
      const data = await res.json();
      const songList = data?.singer?.data?.songlist || [];
      totalSong = data?.singer?.data?.total_song || totalSong;
      singerName = data?.singer?.data?.singer_info?.name || singerName;

      if (songList.length === 0) break;

      for (const item of songList) {
        const song = item.song || item;
        const name = (song.name || '').trim();
        const songmid = song.mid || '';
        const songid = song.id || 0;

        if (!name || !songmid) continue;
        if (isJunkTrack(name)) continue;
        if (isLiveTrack(name)) continue;
        if (isMedleyTrack(name)) continue;

        const album = song.album || {};
        const albumMid = album.mid || '';
        const albumName = album.name || '';
        const albumDate = album.time_public || '';

        if (isLiveAlbum(albumName)) continue;

        const key = baseKey(name);
        if (seen.has(key)) continue;
        seen.add(key);

        allSongs.push({
          name,
          songmid,
          songid,
          albumMid,
          albumName,
          albumDate,
        });
      }

      if (totalSong > 0 && allSongs.length >= totalSong) break;
      page++;
      await sleep(200);
    } catch (err) {
      console.error(`  ❌ 获取歌曲第${page + 1}页失败: ${err.message}`);
      break;
    }
  }

  return { songs: allSongs, totalSong, singerName };
}

// 获取专辑详情（含专辑类型，旧 GetAlbumList API 已失效）
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
    const root = data?.req?.data;
    const info = root?.basicInfo;
    if (!info) return null;
    let desc = info.albumDesc || info.desc || '';
    // GetAlbumDetail 无 desc → 兜底调 fcg_v8_album_info_cp.fcg
    if (!desc) desc = await fetchAlbumDescFallback(albumMid);
    // 专辑归属歌手（singerList 首位为主唱）
    const singerList = root?.singer?.singerList || [];
    const albumSingers = singerList
      .filter((s) => s.name)
      .map((s) => s.name);
    return {
      mid: albumMid,
      name: info.albumName || '',
      aDate: info.publishDate || '',
      albumType: info.albumType || '',
      type: info.type || 0,
      desc,
      albumSingers,
    };
  } catch {
    return null;
  }
}

// 兜底获取专辑简介（fcg 端点）
async function fetchAlbumDescFallback(albumMid) {
  const url = `https://c.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg?albummid=${albumMid}&format=json&inCharset=utf8&outCharset=utf-8&platform=yqq`;
  try {
    const res = await fetch(url, { headers: QQ_HEADERS });
    const data = await res.json();
    return data?.data?.desc || data?.desc || '';
  } catch {
    return '';
  }
}

// 获取专辑完整曲目（fcg_v8_album_info_cp.fcg，含逐曲歌手数组）
// 返回 null 表示拉取失败；返回 [] 表示专辑无曲目
// 列表顺序即专辑官方曲序；albumTrack 为专辑内曲目序号（1 起），多碟按 belongCD 累计编号
async function fetchAlbumTracklist(albumMid) {
  const url =
    `https://c.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg` +
    `?albummid=${albumMid}&format=json&inCharset=utf8&outCharset=utf-8&platform=yqq`;
  try {
    const res = await fetch(url, { headers: QQ_HEADERS });
    const data = await res.json();
    const list = data?.data?.list || [];
    return list.map((t, i) => ({
      name: (t.songname || '').trim(),
      songmid: t.songmid || '',
      songid: t.songid || 0,
      albumMid: t.albummid || albumMid,
      albumName: (t.albumname || '').trim(),
      albumDate: (t.time_public || '').trim(),
      singers: (t.singer || []).map((s) => s.name).filter(Boolean),
      albumTrack: i + 1,
    }));
  } catch {
    return null;
  }
}

// 获取歌曲歌词（用于识别纯音乐）；返回 null 表示拉取失败（不判定）
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

// 批量获取歌曲收藏量（用于种子排序）
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

// ---------- 网易云 API ----------

// 获取网易云歌曲 nid（用于音频试听回退）
async function fetchNeteaseNid(songName, artistName) {
  const keyword = encodeURIComponent(`${artistName} ${songName}`);
  const url = `https://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${keyword}&type=1&offset=0&total=true&limit=5`;

  try {
    const res = await fetch(url, { headers: NETEASE_HEADERS });
    const data = await res.json();
    const songs = data?.result?.songs || [];

    // 精确匹配：艺术家包含歌手名
    for (const s of songs) {
      const artists = (s.artists || []).map((a) => a.name).join(' ');
      if (artists.includes(artistName)) return s.id;
    }

    // 降级：取第一个结果
    return songs[0]?.id || null;
  } catch {
    return null;
  }
}

// ---------- 主流程 ----------

async function processSinger(singerId, singerInfo) {
  console.log(`\n🎵 处理歌手: ${singerInfo.name} (${singerId})`);

  // 1. 获取歌曲列表
  console.log(`  📥 获取歌曲列表...`);
  const { songs, totalSong, singerName } = await fetchSingerSongs(
    singerInfo.singermid,
  );
  console.log(`  ✅ 获取到 ${songs.length} 首歌曲 (总数 ${totalSong})`);

  // 2. 收集所有唯一 albumMid，下载封面 + 获取专辑类型
  const uniqueAlbumMids = new Set();
  for (const song of songs) {
    if (song.albumMid) uniqueAlbumMids.add(song.albumMid);
  }

  console.log(`  📥 下载 ${uniqueAlbumMids.size} 张专辑封面...`);
  let coverDownloaded = 0;
  for (const albumMid of uniqueAlbumMids) {
    const imgUrl = `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg`;
    const destPath = join(
      PROJECT_ROOT,
      'public',
      'covers',
      `album_${albumMid}.jpg`,
    );
    await downloadImage(imgUrl, destPath);
    coverDownloaded++;
    if (coverDownloaded % 10 === 0) {
      console.log(`    已下载 ${coverDownloaded}/${uniqueAlbumMids.size}...`);
    }
    await sleep(50); // 避免请求过快
  }
  console.log(`  ✅ 封面下载完成`);

  // 3. 获取专辑类型+简介（逐专辑调用 GetAlbumDetail）
  console.log(`  📥 获取 ${uniqueAlbumMids.size} 张专辑类型和简介...`);
  const albumTypeMap = new Map(); // albumMid → albumType
  const albumDateMap = new Map(); // albumMid → publishDate
  const albumDescMap = new Map(); // albumMid → desc
  const albumSingerMap = new Map(); // albumMid → 专辑归属歌手名数组
  const albumNameMap = new Map(); // albumMid → 专辑名
  let albumDetailCount = 0;
  for (const albumMid of uniqueAlbumMids) {
    const detail = await fetchAlbumDetail(albumMid);
    if (detail) {
      albumTypeMap.set(albumMid, detail.albumType);
      if (detail.name) albumNameMap.set(albumMid, detail.name);
      if (detail.aDate) albumDateMap.set(albumMid, detail.aDate);
      if (detail.desc) albumDescMap.set(albumMid, detail.desc);
      if (detail.albumSingers?.length) {
        albumSingerMap.set(albumMid, detail.albumSingers);
      }
    }
    albumDetailCount++;
    if (albumDetailCount % 10 === 0) {
      console.log(`    已获取 ${albumDetailCount}/${uniqueAlbumMids.size}...`);
    }
    await sleep(150);
  }
  console.log(`  ✅ 专辑类型获取完成 (成功 ${albumTypeMap.size}/${uniqueAlbumMids.size})`);

  // 4. 确定归属专辑，拉取每张归属专辑的完整曲目
  // 规则：
  //   1) 专辑归属：专辑歌手列表必须包含目标歌手本身（他人专辑如陶喆《太美丽》跳过）。
  //   2) 曲目歌手：该曲歌手数组必须包含目标歌手（合唱歌如《海盗》正常保留，他者歌曲剔除）。
  //   3) 垃圾过滤：口白/伴奏/播客/Remix/串烧/Live 整张或逐曲剔除（含专辑类型 人声音频/现场专辑）。
  //   4) 去重：同一首歌在录音室专辑/精选集重复出现时，优先录音室专辑、更早发行日。
  //   5) 未分类歌曲（无 albumMid）一律丢弃——无法校验归属，且常为他人作品误挂。
  const singerNameMatch = singerName || singerInfo.name;
  const ownedAlbums = [];
  const notOwnedAlbums = new Set();
  for (const albumMid of uniqueAlbumMids) {
    const owners = albumSingerMap.get(albumMid);
    if (owners && owners.length > 0) {
      const ownsAlbum = owners.some((n) => n === singerNameMatch);
      if (!ownsAlbum) {
        notOwnedAlbums.add(albumMid);
        continue;
      }
    }
    ownedAlbums.push(albumMid);
  }
  console.log(
    `  📥 归属专辑 ${ownedAlbums.length} 张 (他人专辑 ${notOwnedAlbums.size} 张)，拉取完整曲目...`,
  );

  const candidates = [];
  const failedAlbums = new Set();
  let albumFetched = 0;
  let trackJunkFiltered = 0;
  let trackSingerFiltered = 0;
  for (const albumMid of ownedAlbums) {
    const albumType = albumTypeMap.get(albumMid) || '';
    const albumDate = albumDateMap.get(albumMid) || '';
    const albumName = albumNameMap.get(albumMid) || '';
    // 整张专辑按类型/名称过滤（口白/播客/现场）
    if (JUNK_ALBUM_TYPES.includes(albumType) || isJunkAlbum(albumName) || isLiveAlbum(albumName)) {
      continue;
    }
    const tracklist = await fetchAlbumTracklist(albumMid);
    if (!tracklist) {
      failedAlbums.add(albumMid);
      continue;
    }
    albumFetched++;
    for (const t of tracklist) {
      if (!t.name || !t.songmid) continue;
      if (isJunkTrack(t.name)) {
        trackJunkFiltered++;
        continue;
      }
      if (isLiveTrack(t.name)) continue;
      if (isMedleyTrack(t.name)) continue;
      // 曲目歌手校验：目标歌手必须是该曲歌手之一
      if (t.singers.length && !t.singers.includes(singerNameMatch)) {
        trackSingerFiltered++;
        continue;
      }
      candidates.push({
        song: {
          name: t.name,
          songmid: t.songmid,
          songid: t.songid,
          albumMid,
          albumName: t.albumName || albumName,
          albumDate: albumDate || t.albumDate,
          albumTrack: t.albumTrack,
        },
        albumType,
        albumDate,
      });
    }
    await sleep(150);
  }

  // 兜底：曲目拉取失败的归属专辑，用 hot-list 歌曲补（未分类歌曲一律丢弃）
  for (const song of songs) {
    if (!song.albumMid || !failedAlbums.has(song.albumMid)) continue;
    if (isJunkTrack(song.name) || isLiveTrack(song.name) || isMedleyTrack(song.name)) continue;
    candidates.push({
      song,
      albumType: albumTypeMap.get(song.albumMid) || '',
      albumDate: albumDateMap.get(song.albumMid) || song.albumDate || '',
    });
  }

  // 4.5 纯音乐检测：逐曲调歌词接口，命中纯音乐占位文案则剔除。
  //     电影原声带/配乐/音乐电影等专辑常混入无填词演奏曲，统一全量检测。
  const filteredCandidates = [];
  let pureInstrumentalFiltered = 0;
  for (const c of candidates) {
    const lyric = await fetchSongLyric(c.song.songmid);
    if (lyric !== null && PURE_INSTRUMENTAL_LYRIC.test(lyric)) {
      pureInstrumentalFiltered++;
      continue;
    }
    filteredCandidates.push(c);
    await sleep(120);
  }
  if (pureInstrumentalFiltered > 0) {
    console.log(
      `  🚫 已过滤 ${pureInstrumentalFiltered} 首纯音乐（原声带/配乐专辑内无填词演奏曲）`,
    );
  }

  // 去重：按 baseKey，优先 录音室专辑 / 更早发行日
  const priority = (albumType) =>
    albumType === '录音室专辑' ? 0 : /精选|合辑/.test(albumType) ? 2 : 1;
  const byBaseKey = new Map();
  for (const c of filteredCandidates) {
    const key = baseKey(c.song.name);
    const cur = byBaseKey.get(key);
    const p = priority(c.albumType);
    const better =
      !cur ||
      p < priority(cur.albumType) ||
      (p === priority(cur.albumType) && (c.albumDate || '') < (cur.albumDate || ''));
    if (better) byBaseKey.set(key, c);
  }
  const finalSongs = [...byBaseKey.values()].map((c) => c.song);
  console.log(
    `  ✅ 曲目拉取完成：归属专辑 ${albumFetched} 张，有效 ${finalSongs.length} 首` +
      ` (垃圾 ${trackJunkFiltered}，非主唱 ${trackSingerFiltered})`,
  );

  // 5. 获取收藏量（批量，用于种子排序）
  console.log(`  📥 获取歌曲收藏量...`);
  const allSongIds = finalSongs.map((s) => s.songid).filter((id) => id > 0);
  const favMap = await fetchSongFavCounts(allSongIds);
  console.log(`  ✅ 收藏量获取完成 (${Object.keys(favMap).length}/${allSongIds.length})`);

  // 6. 获取网易云 nid（逐首搜索）
  console.log(`  📥 获取网易云 nid (共 ${finalSongs.length} 首)...`);
  let nidCount = 0;
  for (let i = 0; i < finalSongs.length; i++) {
    const song = finalSongs[i];
    const nid = await fetchNeteaseNid(song.name, singerName || singerInfo.name);
    song.nid = nid;
    if (nid) nidCount++;
    await sleep(200); // 控制频率
    if ((i + 1) % 20 === 0) {
      console.log(`    已处理 ${i + 1}/${finalSongs.length} (成功 ${nidCount})...`);
    }
  }
  console.log(`  ✅ nid 获取完成 (成功 ${nidCount}/${finalSongs.length})`);

  // 7. 下载歌手头像
  console.log(`  📥 下载歌手头像...`);
  const singerPhotoUrl = `https://y.gtimg.cn/music/photo_new/T001R300x300M000${singerInfo.singermid}.jpg`;
  const singerPhotoPath = join(
    PROJECT_ROOT,
    'public',
    'covers',
    `singer_${singerInfo.singermid}.jpg`,
  );
  await downloadImage(singerPhotoUrl, singerPhotoPath);
  console.log(`  ✅ 歌手头像下载完成`);

  // 8. 构建输出数据
  // 所有歌曲均来自归属专辑的完整曲目，专辑内歌曲无论收藏量多低都保留；
  // 按收藏量降序作为种子排序基准。
  // 收藏量相等的歌曲（热门封顶导致大量同值）按专辑内曲序升序打断：
  // 主打歌/专辑前列曲目优先，避免热门歌曲全部并列。
  const byFav = [...finalSongs].sort((a, b) => {
    const favDiff = (favMap[b.songid] || 0) - (favMap[a.songid] || 0);
    if (favDiff !== 0) return favDiff;
    const ta = a.albumTrack == null ? 999 : a.albumTrack;
    const tb = b.albumTrack == null ? 999 : b.albumTrack;
    return ta - tb;
  });

  const entrants = byFav.map((song) => {
    const pic = song.albumMid
      ? `/covers/album_${song.albumMid}.jpg`
      : '';

    return {
      name: song.name,
      songmid: song.songmid,
      songid: song.songid,
      pic,
      albumMid: song.albumMid,
      albumName: song.albumName,
      albumDate: song.albumDate || albumDateMap.get(song.albumMid) || '',
      albumType: albumTypeMap.get(song.albumMid) || '',
      albumTrack: song.albumTrack || null,
      nid: song.nid || null,
      favCount: favMap[song.songid] || 0,
    };
  });
  if (notOwnedAlbums.size > 0) {
    console.log(`  🚫 已跳过 ${notOwnedAlbums.size} 张他人专辑`);
  }
  if (trackSingerFiltered > 0) {
    console.log(`  🚫 已过滤 ${trackSingerFiltered} 首非${singerNameMatch}主唱的曲目`);
  }
  if (trackJunkFiltered > 0) {
    console.log(`  🚫 已过滤 ${trackJunkFiltered} 首垃圾曲目（口白/伴奏/播客/Remix等）`);
  }

  const output = {
    singermid: singerInfo.singermid,
    singerName: singerName || singerInfo.name,
    singerPhoto: `/covers/singer_${singerInfo.singermid}.jpg`,
    totalSong,
    albumCount: ownedAlbums.length,
    preprocessed: true,
    albumDescs: Object.fromEntries(albumDescMap),
    entrants,
  };

  // 9. 保存 JSON
  const dataDir = join(PROJECT_ROOT, 'src', 'data', 'singerData');
  await mkdir(dataDir, { recursive: true });
  const jsonPath = join(dataDir, `${singerId}.json`);
  await writeFile(jsonPath, JSON.stringify(output, null, 2));
  console.log(`  💾 数据已保存: src/data/singerData/${singerId}.json`);

  return {
    songCount: entrants.length,
    albumCount: ownedAlbums.length,
  };
}

async function main() {
  console.log('🚀 开始预取 QQ 音乐数据...\n');

  // 创建输出目录
  await mkdir(join(PROJECT_ROOT, 'public', 'covers'), { recursive: true });
  await mkdir(join(PROJECT_ROOT, 'src', 'data', 'singerData'), {
    recursive: true,
  });

  const summary = {};

  // 可选: node scripts/download-singer-data.js jay jolin 只处理指定歌手
  const only = process.argv.slice(2);

  for (const [singerId, singerInfo] of Object.entries(SINGERS)) {
    if (only.length && !only.includes(singerId)) continue;
    try {
      const result = await processSinger(singerId, singerInfo);
      summary[singerId] = result;
    } catch (err) {
      console.error(`❌ 处理歌手 ${singerId} 失败: ${err.message}`);
      summary[singerId] = { songCount: 0, albumCount: 0, error: err.message };
    }
  }

  // 保存汇总文件
  const summaryPath = join(
    PROJECT_ROOT,
    'src',
    'data',
    'singerData',
    'index.json',
  );
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n📊 汇总信息已保存: src/data/singerData/index.json`);
  console.log('\n✅ 预取完成！汇总:');
  for (const [id, info] of Object.entries(summary)) {
    console.log(`  ${id}: ${info.songCount} 首, ${info.albumCount} 张专辑`);
  }
}

main().catch((err) => {
  console.error('💥 预取失败:', err);
  process.exit(1);
});
