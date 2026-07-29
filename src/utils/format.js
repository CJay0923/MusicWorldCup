// Formatting utilities

export function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

// Serialize/deserialize entrant for localStorage
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
  };
}
