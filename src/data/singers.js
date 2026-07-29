// src/data/singers.js — 歌手元数据 + 常量 + 工具函数
// 歌曲数据已迁移到 public/singerData/{id}.json，由 useSingerData.js 按需 fetch
// 本文件不再包含静态歌曲数组（LEFT/RIGHT/NIDS/PICS/CHORUS），大幅减少打包体积

// ---------- 歌手元数据（仅用于初始 UI 显示，歌曲数据懒加载）----------
export const SINGERS = {
  stefanie: { name: '孙燕姿', nameEn: 'SUN', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  jj: { name: '林俊杰', nameEn: 'JJ', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  jay: { name: '周杰伦', nameEn: 'JAY', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  jolin: { name: '蔡依林', nameEn: 'JOLIN', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  david: { name: '陶喆', nameEn: 'DAVID', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  she: { name: 'S.H.E', nameEn: 'SHE', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
  eason: { name: '陈奕迅', nameEn: 'EASON', bracketSize: 128, entrants: [], seeds: [], seedRank: {} },
};

export const STATIC_SINGERS = SINGERS;

export const SINGER_ICONS = { stefanie: '🎵', jj: '🎶', jay: '🎹', jolin: '💃', david: '🎸', she: '🌟', eason: '🎤' };

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
  const entrants = used.map((src, i) => ({
    name: src.name,
    id: i,
    side: i < bs / 2 ? 'L' : 'R',
    seed: i + 1,
    nid: src.nid || null,
    pic: src.pic || '',
    chorus: src.chorus || null,
    seedRank: i + 1,
    isSeed: i < Math.min(32, bs),
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
  const MIN_SONGS_FOR_ALBUM = 3;
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
