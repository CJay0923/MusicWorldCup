// src/data/singers.js — 歌手元数据 + 常量 + 工具函数
// 歌曲数据已迁移到 public/singerData/{id}.json，由 useSingerData.js 按需 fetch
// 本文件不再包含静态歌曲数组（LEFT/RIGHT/NIDS/PICS/CHORUS），大幅减少打包体积

// ---------- 歌手元数据（仅用于初始 UI 显示，歌曲数据懒加载）----------
export const SINGERS = {
  // 男歌手：周王陶林 + 方大同 + 陈奕迅 + 五月天 + 李荣浩
  jay: { name: '周杰伦', nameEn: 'JAY', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  leehom: { name: '王力宏', nameEn: 'LEEHOM', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  david: { name: '陶喆', nameEn: 'DAVID', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  jj: { name: '林俊杰', nameEn: 'JJ', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  khalil: { name: '方大同', nameEn: 'KHALIL', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  eason: { name: '陈奕迅', nameEn: 'EASON', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  mayday: { name: '五月天', nameEn: 'MAYDAY', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  lironghao: { name: '李荣浩', nameEn: 'LI', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  // 女歌手：四大三小 + SHE + 张惠妹 + 邓紫棋
  stefanie: { name: '孙燕姿', nameEn: 'SUN', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  jolin: { name: '蔡依林', nameEn: 'JOLIN', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  fish: { name: '梁静茹', nameEn: 'FISH', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  elva: { name: '萧亚轩', nameEn: 'ELVA', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  angela: { name: '张韶涵', nameEn: 'ANGELA', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  cyndi: { name: '王心凌', nameEn: 'CYNDI', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  rainie: { name: '杨丞琳', nameEn: 'RAINIE', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  she: { name: 'S.H.E', nameEn: 'SHE', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  amei: { name: '张惠妹', nameEn: 'AMEI', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  gem: { name: '邓紫棋', nameEn: 'GEM', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  sandy: { name: '林忆莲', nameEn: 'SANDY', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  lala: { name: '徐佳莹', nameEn: 'LALA', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
};

export const STATIC_SINGERS = SINGERS;

export const SINGER_ICONS = {
  jay: '🎹', leehom: '🎻', david: '🎸', jj: '🎶', khalil: '🎷',
  eason: '🎤', mayday: '🌟', lironghao: '🎵',
  stefanie: '☀️', jolin: '💃', fish: '🐠', elva: '⚡',
  angela: '🌈', cyndi: '💝', rainie: '🌺',
  she: '👯', amei: '🔥', gem: '💎',
  sandy: '🌙', lala: '⭐',
};

// World Cup constants
export const WC_GROUPS = 12;
export const WC_GROUP_SIZE = 4;
export const WC_WILDCARDS = 8;
export const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');
export const WC_KO_TEAMS = 32;
// 四选二赛制：12 组每组 1 次多选 + 31 场淘汰赛 = 43 步
export const WC_TOTAL_MATCHES = WC_GROUPS + 31;

// 灵活赛制规模定义：根据可用歌曲数自动选择
// n=参赛歌曲数, groups=小组数(每组4首选2), bracket=淘汰赛规模, wild=外卡复活名额
export const TOURNAMENT_SIZES = [
  { n: 128, groups: 12, bracket: 32, wild: 8 }, // 标准128强世界杯
  { n: 64, groups: 12, bracket: 32, wild: 8 }, // 64强世界杯(取前48分组)
  { n: 48, groups: 12, bracket: 32, wild: 8 }, // 48首世界杯
  { n: 32, groups: 8, bracket: 16, wild: 0 }, // 32首世界杯
  { n: 16, groups: 0, bracket: 16, wild: 0 }, // 纯淘汰赛
  { n: 8, groups: 0, bracket: 8, wild: 0 }, // 纯淘汰赛
];

// 经典模式可选规模（2的幂）
export const CLASSIC_BRACKETS = [128, 64, 32, 16, 8, 4];

/**
 * 根据可用歌曲数选择最大可用赛制
 */
export function pickTournamentSize(avail) {
  return (
    TOURNAMENT_SIZES.find((x) => avail >= x.n) ||
    TOURNAMENT_SIZES[TOURNAMENT_SIZES.length - 1]
  );
}

/**
 * 获取经典模式可用规模列表
 */
export function classicOptions(avail) {
  return CLASSIC_BRACKETS.filter((b) => b <= avail);
}

// Audio API constants
export const BYFUNS_API = 'https://api.byfuns.top/1/?id=';
export const METING_API = 'https://api.injahow.cn/meting/?server=netease&type=url&id=';

/**
 * 将多个歌手的歌曲合并为跨歌手对战数据集
 * 确保：① 每位歌手歌曲数量一致（取最小值，向下对齐到 bracketSize/numSingers）
 *      ② 交叉排序（interleave）使各歌手代表作均匀分布
 *      ③ 首轮避免同歌手内战
 *
 * @param {object[]} singerDataList - 多个歌手的 singerData 对象数组
 * @param {number} bracketSize - 目标淘汰赛规模（2 的幂）
 * @returns {{name, nameEn, bracketSize, entrants, seeds, seedRank}|null}
 */
export function buildCrossSingerData(singerDataList, bracketSize) {
  const valid = singerDataList.filter((s) => s?.entrants?.length);
  if (valid.length < 2) return null;

  const numSingers = valid.length;

  // 每位歌手取样数：确保各歌手数量一致
  // 取 bracketSize / numSingers 向下取整，但至少 2 首
  const perSinger = Math.max(2, Math.floor(bracketSize / numSingers));

  // 实际 bracketSize = perSinger * numSingers，向下对齐到 2 的幂
  let totalSongs = perSinger * numSingers;
  let bs = 1;
  while (bs * 2 <= totalSongs) bs *= 2;
  // 如果对齐后每位歌手的歌曲数变了，重新计算
  const actualPerSinger = Math.floor(bs / numSingers);
  const finalTotal = actualPerSinger * numSingers;
  const finalSize = Math.max(finalTotal, 4);

  // 1. 每位歌手按 seedRank 升序取前 actualPerSinger 首，注入歌手信息
  const collected = [];
  for (const sd of valid) {
    const sorted = [...sd.entrants].sort(
      (a, b) => (a.seedRank || 999) - (b.seedRank || 999),
    );
    const topN = sorted.slice(0, actualPerSinger);
    collected.push({
      singerName: sd.name,
      singerPhoto: sd.singerPhoto || null,
      songs: topN.map((song) => ({
        ...song,
        // 强制覆盖确保 singerName 不会从上游继承错误值
        __singerName: sd.name,
        __singerPhoto: sd.singerPhoto || null,
      })),
    });
  }

  // 2. 交叉排序（interleave）：A1, B1, C1, A2, B2, C2, ...
  const merged = [];
  for (let rank = 0; rank < actualPerSinger; rank++) {
    for (const c of collected) {
      if (rank < c.songs.length) {
        const s = c.songs[rank];
        merged.push({
          ...s,
          singerName: c.singerName || s.__singerName,
          singerPhoto: c.singerPhoto || s.__singerPhoto,
        });
      }
    }
  }

  let used = merged.slice(0, finalSize);

  // 3. 避免同歌手歌曲首轮对决
  //    检查每对 (0,1), (2,3), (4,5)... 是否同歌手，若冲突则与最近的不同歌手歌曲交换
  const avoidSameSingerFirstRound = (songs) => {
    const result = [...songs];
    const n = result.length;
    for (let i = 0; i < n; i += 2) {
      const a = result[i];
      const b = result[i + 1];
      if (!a || !b) continue;
      if (!a.singerName || !b.singerName) continue;
      if (a.singerName !== b.singerName) continue;

      // 冲突：a 和 b 同歌手，需要找一个不同歌手的歌曲交换 b
      let bestSwap = -1;
      let bestSwapRankDiff = Infinity;
      for (let j = i + 2; j < n; j++) {
        const candidate = result[j];
        if (!candidate || !candidate.singerName) continue;
        if (candidate.singerName === a.singerName) continue;

        // 检查交换后是否会在候选位置产生新的冲突
        const partnerIdx = j % 2 === 0 ? j + 1 : j - 1;
        const partner = result[partnerIdx];
        if (partner && partner.singerName && partner.singerName === b.singerName) {
          continue;
        }
        // 优先选择 seedRank 接近的进行交换，减少种子位混乱
        const rankDiff = Math.abs(
          (candidate.seedRank || 999) - (b.seedRank || 999),
        );
        if (rankDiff < bestSwapRankDiff) {
          bestSwap = j;
          bestSwapRankDiff = rankDiff;
        }
      }

      if (bestSwap >= 0) {
        [result[i + 1], result[bestSwap]] = [result[bestSwap], result[i + 1]];
      }
    }
    return result;
  };

  const finalSongs = avoidSameSingerFirstRound(used);

  // 4. 重新编号 id / side / seed / seedRank
  const entrants = finalSongs.map((src, i) => ({
    ...src,
    id: i,
    side: i < finalSize / 2 ? 'L' : 'R',
    seed: i + 1,
    seedRank: i + 1,
    isSeed: i < Math.min(32, finalSize),
  }));

  const seeds = entrants.map((_, i) => i);
  const seedRank = Object.fromEntries(
    entrants.map((e, i) => [i, i + 1]),
  );

  const singerNames = valid.map((s) => s.name).join(' vs ');

  return {
    name: singerNames,
    nameEn: 'CROSS',
    bracketSize: finalSize,
    entrants,
    seeds,
    seedRank,
  };
}

/**
 * 跨歌手专辑对决：将多位歌手的专辑作为参赛选手
 * @param {object[]} singerDataList - 多个歌手的 singerData 对象数组
 * @param {number} bracketSize - 目标淘汰赛规模
 * @returns {{name, nameEn, bracketSize, entrants, seeds, seedRank}|null}
 */
export function buildCrossSingerAlbumData(singerDataList, bracketSize) {
  const valid = singerDataList.filter((s) => s?.entrants?.length);
  if (valid.length < 2) return null;

  const numSingers = valid.length;
  const perSinger = Math.max(2, Math.floor(bracketSize / numSingers));

  let totalAlbums = perSinger * numSingers;
  let bs = 1;
  while (bs * 2 <= totalAlbums) bs *= 2;
  const actualPerSinger = Math.floor(bs / numSingers);
  const finalTotal = actualPerSinger * numSingers;
  const finalSize = Math.max(finalTotal, 4);

  // 每位歌手提取专辑（跳过未分类），按发行日期取前 N 张
  const collected = [];
  for (const sd of valid) {
    const groups = getAlbumGroups(sd.entrants || []);
    const personalAlbums = groups.filter((g) => !g.isMisc);
    // 按收藏量（专辑内歌曲总收藏量）降序排序
    const sorted = personalAlbums
      .map((g) => ({
        ...g,
        totalFav: g.songs.reduce((sum, s) => sum + (s.favCount || 0), 0),
      }))
      .sort((a, b) => b.totalFav - a.totalFav);
    const topN = sorted.slice(0, actualPerSinger);
    collected.push({
      singerName: sd.name,
      singerPhoto: sd.singerPhoto || null,
      albums: topN,
    });
  }

  // 交叉排序
  const merged = [];
  for (let rank = 0; rank < actualPerSinger; rank++) {
    for (const c of collected) {
      if (rank < c.albums.length) {
        const album = c.albums[rank];
        const albumMid = album.albumMid || '';
        merged.push({
          type: 'album',
          name: album.name,
          pic: album.pic || (albumMid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg` : ''),
          picLocal: albumMid ? `./covers/album_${albumMid}.jpg` : '',
          albumMid,
          singerName: c.singerName,
          singerPhoto: c.singerPhoto,
          songCount: album.songs.length,
          albumDate: album.date || '',
          albumDesc: album.desc || '',
          seedRank: rank + 1,
        });
      }
    }
  }

  let used = merged.slice(0, finalSize);

  // 避免同歌手首轮内战（复用算法）
  const avoidSameSingerFirstRound = (items) => {
    const result = [...items];
    const n = result.length;
    for (let i = 0; i < n; i += 2) {
      const a = result[i];
      const b = result[i + 1];
      if (!a || !b) continue;
      if (a.singerName !== b.singerName) continue;
      let bestSwap = -1;
      for (let j = i + 2; j < n; j++) {
        const candidate = result[j];
        if (!candidate || candidate.singerName === a.singerName) continue;
        const partnerIdx = j % 2 === 0 ? j + 1 : j - 1;
        const partner = result[partnerIdx];
        if (partner && partner.singerName === b.singerName) continue;
        bestSwap = j;
        break;
      }
      if (bestSwap >= 0) {
        [result[i + 1], result[bestSwap]] = [result[bestSwap], result[i + 1]];
      }
    }
    return result;
  };

  const finalItems = avoidSameSingerFirstRound(used);

  const entrants = finalItems.map((src, i) => ({
    ...src,
    id: i,
    side: i < finalSize / 2 ? 'L' : 'R',
    seed: i + 1,
    seedRank: i + 1,
    isSeed: i < Math.min(32, finalSize),
  }));

  const singerNames = valid.map((s) => s.name).join(' vs ');

  return {
    name: singerNames,
    nameEn: 'CROSS_ALBUM',
    bracketSize: finalSize,
    entrants,
    seeds: entrants.map((_, i) => i),
    seedRank: Object.fromEntries(entrants.map((e, i) => [i, i + 1])),
  };
}

/**
 * 跨歌手歌手对决：将歌手本身作为参赛选手
 * @param {object[]} singerDataList - 多个歌手的 singerData 对象数组
 * @returns {{name, nameEn, bracketSize, entrants, seeds, seedRank}|null}
 */
export function buildCrossSingerSingerData(singerDataList) {
  const valid = singerDataList.filter((s) => s?.entrants?.length);
  if (valid.length < 2) return null;

  // bracketSize 向下对齐到 2 的幂
  let bs = 1;
  while (bs * 2 <= valid.length) bs *= 2;
  const finalSize = Math.max(bs, 2);

  // 取前 finalSize 位歌手
  const used = valid.slice(0, finalSize);

  // 构建 entrants
  const merged = used.map((sd, i) => {
    const topSong = sd.entrants?.[0];
    const groups = getAlbumGroups(sd.entrants || []);
    const albumCount = groups.filter((g) => !g.isMisc).length;
    return {
      type: 'singer',
      name: sd.name,
      pic: sd.singerPhoto || '',
      singerName: sd.name,
      singerPhoto: sd.singerPhoto,
      songCount: sd.entrants?.length || 0,
      albumCount,
      topSong: topSong?.name || '',
      seedRank: i + 1,
    };
  });

  const entrants = merged.map((src, i) => ({
    ...src,
    id: i,
    side: i < finalSize / 2 ? 'L' : 'R',
    seed: i + 1,
    seedRank: i + 1,
    isSeed: i < Math.min(32, finalSize),
  }));

  const singerNames = used.map((s) => s.name).join(' vs ');

  return {
    name: singerNames,
    nameEn: 'CROSS_SINGER',
    bracketSize: finalSize,
    entrants,
    seeds: entrants.map((_, i) => i),
    seedRank: Object.fromEntries(entrants.map((e, i) => [i, i + 1])),
  };
}

/**
 * 计算夯到拉排名模式的分层结构
 * 等级：夯 → 顶级 → 人上人 → NPC → 拉完了
 * 不设数量限制，用户可自由分配任意数量到任意等级
 *
 * @param {number} totalItems - 总项目数（仅用于参考，不限制）
 * @returns {{tiers: {label, count: number}[], totalSlots: number}}
 */
export function buildRankingTiers(totalItems) {
  const TIER_LABELS = ['夯', '顶级', '人上人', 'NPC', '拉完了'];
  const tiers = TIER_LABELS.map((label) => ({
    label,
    count: Infinity, // 无限制
  }));
  return { tiers, totalSlots: totalItems || 0 };
}

/**
 * 根据选中的 entrant 对象数组构建自定义歌手数据（自选模式）
 * 保留原始 nid / pic / chorus 等元数据，使试听功能可用
 * @param {object[]} selected - 选中的 entrant 对象数组
 * @param {number} bracketSize - 淘汰赛规模（必须是 2 的幂）
 * @param {string} [singerName] - 歌手名称
 * @returns {{name:string,nameEn:string,bracketSize:number,entrants:object[],seeds:number[],seedRank:object}}
 */
export function buildCustomSingerData(selected, bracketSize, singerName) {
  const valid = (selected || []).filter((e) => e && e.name);
  const bs = bracketSize || 4;

  // 按热度排序：seedRank 越小越热门，取前 bs 首
  const sorted = [...valid].sort((a, b) => {
    const ra = a.seedRank ?? 999;
    const rb = b.seedRank ?? 999;
    return ra - rb;
  });
  const used = sorted.slice(0, bs);

  // 重新编号：id 0..N-1，seedRank 1..N
  // 保留所有封面相关字段以支持完整的 fallback 链
  const entrants = used.map((src, i) => ({
    name: src.name,
    id: i,
    side: i < bs / 2 ? 'L' : 'R',
    seed: i + 1,
    nid: src.nid || null,
    songmid: src.songmid || '',
    songid: src.songid || 0,
    pic: src.pic || '',
    picLocal: src.picLocal || '',
    songPic: src.songPic || '',
    albumMid: src.albumMid || '',
    albumName: src.albumName || '',
    albumDate: src.albumDate || '',
    albumType: src.albumType || '',
    albumDesc: src.albumDesc || '',
    chorus: src.chorus || null,
    seedRank: i + 1,
    isSeed: i < Math.min(32, bs),
    itunesPreviewUrl: src.itunesPreviewUrl || '',
    itunesTrackUrl: src.itunesTrackUrl || '',
  }));

  // seeds = [0, 1, ..., N-1] 表示按热度排序后的索引。
  // bracket 生成时 drawSeats 会分档随机打乱（每4首一档），
  // bracketOrder 会标准蛇形落位（1-2名分入上下半区，3-4名分散，依次类推）。
  const seeds = entrants.map((_, i) => i);

  return {
    name: singerName ? `${singerName}·自选` : '自选',
    nameEn: 'CUSTOM',
    bracketSize: bs,
    entrants,
    seeds,
    seedRank: Object.fromEntries(entrants.map((e, i) => [i, i + 1])),
  };
}

/**
 * 将 entrant 列表按专辑分组，并附带专辑名称和简介
 * 只将"录音室专辑"且歌曲数≥3的专辑单独成组，
 * 其余（单曲/EP/现场/OST/合辑/精选等）全部归入"未分类歌曲"。
 * @param {object[]} entrants - entrant 对象数组
 * @returns {{pic:string, name:string, desc:string, date:string, songs:object[], isMisc:boolean}[]}
 */
export function getAlbumGroups(entrants) {
  const MISC_KEY = '__misc__';
  const MIN_SONGS_FOR_ALBUM = 5;
  // 专辑名关键词兜底：排除合辑/精选/原声带/游戏/广告等
  const EXCLUDE_NAME_PATTERNS =
    /精选|合辑|现场|演唱会|Live|LIVE|live|致敬|Tribute|翻唱|Cover|Remix|混音|原声带|OST|游戏|广告|公益|晚会|跨年|春晚|盛典|金曲|音乐节|梦想的声音|我是歌手|我想和你唱/i;

  // 第一遍：按 albumMid/albumName 分组
  const rawGroups = new Map();
  for (const e of entrants) {
    const albumName = e.albumName || '';
    const albumMid = e.albumMid || '';
    const key = albumMid || albumName || `pic-${e.pic || ''}` || MISC_KEY;

    if (!rawGroups.has(key)) {
      rawGroups.set(key, {
        pic: e.pic || '',
        name: albumName,
        albumMid: albumMid,
        desc: e.albumDesc || '',
        date: e.albumDate || '',
        albumType: e.albumType || '',
        songs: [],
      });
    }
    const g = rawGroups.get(key);
    g.songs.push(e);
    if (!g.desc && e.albumDesc) g.desc = e.albumDesc;
    if (e.albumDate && (!g.date || e.albumDate < g.date)) g.date = e.albumDate;
  }

  // 第二遍：判断哪些是个人专辑（录音室专辑 + ≥3首 + 非合辑/精选名）
  const nameMap = new Map();
  nameMap.set(MISC_KEY, {
    pic: '',
    name: '未分类歌曲',
    desc: '',
    date: '',
    company: '',
    isMisc: true,
    songs: [],
  });

  // 个人专辑类型：录音室专辑 + EP + Single + 单曲
  const PERSONAL_ALBUM_TYPES = new Set(['录音室专辑', 'EP', 'Single', '单曲']);

  for (const [key, g] of rawGroups) {
    const isPersonalType = PERSONAL_ALBUM_TYPES.has(g.albumType);
    const hasEnoughSongs = g.songs.length >= MIN_SONGS_FOR_ALBUM;
    const isNotCompilation = !EXCLUDE_NAME_PATTERNS.test(g.name);

    const isPersonal = isPersonalType && hasEnoughSongs && isNotCompilation;

    if (isPersonal) {
      nameMap.set(key, {
        pic: g.pic === '__no_cover__' ? '' : g.pic,
        name: g.name,
        albumMid: g.albumMid || key,
        desc: g.desc,
        date: g.date,
        company: '',
        isMisc: false,
        songs: g.songs,
      });
    } else {
      nameMap.get(MISC_KEY).songs.push(...g.songs);
    }
  }

  // 如果 misc 组没有歌曲，删除它
  if (nameMap.get(MISC_KEY).songs.length === 0) {
    nameMap.delete(MISC_KEY);
  } else {
    // 未分类组内歌曲按收藏量从高到低排序
    nameMap.get(MISC_KEY).songs.sort(
      (a, b) => (b.favCount || 0) - (a.favCount || 0),
    );
  }

  // 个人专辑按发行日期升序，未分类组排最后
  return Array.from(nameMap.values()).sort((a, b) => {
    if (a.isMisc && !b.isMisc) return 1;
    if (!a.isMisc && b.isMisc) return -1;
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
}
