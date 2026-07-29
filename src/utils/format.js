// Formatting utilities

export function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

// Serialize/deserialize entrant for localStorage
// 附加字段（专辑/歌手对战类型）使用短键，缺省时 undefined 以兼容旧存档
export function slimE(s) {
  if (!s) return null;
  return {
    n: s.name,
    i: s.id,
    side: s.side,
    seed: s.seed,
    nid: s.nid,
    pic: s.pic,
    pL: s.picLocal || null,
    sm: s.songmid || null,
    aM: s.albumMid || null,
    chorus: s.chorus,
    sr: s.seedRank,
    isS: s.isSeed,
    // 专辑/歌手对战附加字段（歌曲类型时为 undefined，JSON 序列化时自动省略）
    t: s.type, // 'album' | 'singer' | undefined
    sc: s.songCount, // 专辑内歌曲数
    sN: s.singerName, // 跨歌手对战的歌手名
    sP: s.singerPhoto, // 歌手头像 URL
    aD: s.albumDate, // 专辑发行日期
    iu: s.itunesPreviewUrl || null, // iTunes 预取试听 URL
  };
}

export function restoreE(s) {
  if (!s) return null;
  return {
    name: s.n,
    id: s.i,
    side: s.side,
    seed: s.seed,
    nid: s.nid || null,
    pic: s.pic || '',
    picLocal: s.pL || null,
    songmid: s.sm || null,
    albumMid: s.aM || null,
    chorus: s.chorus || null,
    seedRank: s.sr || 999,
    isSeed: s.isS !== undefined ? s.isS : (s.sr || 999) <= 32,
    // 专辑/歌手对战附加字段：旧存档缺失时回退到 undefined / ''
    type: s.t, // 旧存档无此字段 → undefined（歌曲类型）
    songCount: s.sc, // 旧存档无此字段 → undefined
    singerName: s.sN || '',
    singerPhoto: s.sP || '',
    albumDate: s.aD || '',
    itunesPreviewUrl: s.iu || '', // 旧存档无此字段 → 空字符串（依赖运行时搜索）
  };
}
