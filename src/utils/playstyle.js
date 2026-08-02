// src/utils/playstyle.js
// 玩法统计工具：爆冷检测、打法称号计算、跨会话战绩管理
//
// 设计原则：纯函数，无副作用，不依赖 React。
// 所有统计基于 history 数组（useGameState / useWorldCup 产生）。

// ---------- 爆冷检测 ----------

/**
 * 统计 history 中的爆冷次数（低 seedRank 胜高 seedRank）
 * 仅统计 1v1 对局（跳过 WC 小组赛四选二）
 * @param {Array} history - 历史记录数组
 * @returns {number} 爆冷次数
 */
export function countUpsets(history) {
  if (!history || !history.length) return 0;
  return history.filter((h) => {
    if (!h || !h.winner || !h.loser) return false;
    // 跳过 WC 小组赛四选二（phase === 'group'）
    if (h.phase === 'group') return false;
    const wr = h.winner.seedRank ?? 999;
    const lr = h.loser.seedRank ?? 999;
    // 爆冷：胜者 seedRank 数值更大（排名更低）且差异显著
    return wr > lr;
  }).length;
}

/**
 * 检测某次 pick 是否为爆冷
 * @param {object|null} lastPick - { winner, loser, slot, ... }
 * @returns {boolean}
 */
export function isUpsetPick(lastPick) {
  if (!lastPick || !lastPick.winner || !lastPick.loser) return false;
  return (lastPick.winner.seedRank ?? 999) > (lastPick.loser.seedRank ?? 999);
}

// ---------- 对决张力计算 ----------

/**
 * 计算两位选手之间的对决张力（0-100）
 * seedRank 差越小 → 张力越高（势均力敌）
 * @param {object} leftEntrant
 * @param {object} rightEntrant
 * @returns {number} 0-100
 */
export function computeTension(leftEntrant, rightEntrant) {
  if (!leftEntrant?.seedRank || !rightEntrant?.seedRank) return 0;
  const diff = Math.abs(leftEntrant.seedRank - rightEntrant.seedRank);
  const maxRank = Math.max(leftEntrant.seedRank, rightEntrant.seedRank, 1);
  // 归一化：diff=0 → 100，diff=maxRank → 0
  // 使用平方曲线让中等差距也有一定张力感
  const ratio = 1 - diff / maxRank;
  return Math.round(100 * ratio * ratio);
}

// ---------- 打法称号 ----------

/**
 * 根据本届赛事表现计算打法称号
 * @param {Array} history - 历史记录
 * @param {number} bracketSize - 签表规模
 * @param {number} elapsed - 耗时（秒）
 * @param {boolean} noUndo - 是否零回退
 * @returns {{icon:string, title:string, desc:string}}
 */
export function computePlaystyle(history, bracketSize, elapsed, noUndo) {
  const upsets = countUpsets(history);
  const totalPicks = history.filter((h) => h.phase !== 'group').length;
  const upsetRate = totalPicks > 0 ? upsets / totalPicks : 0;

  // 优先级：爆冷 > 共识 > 闪电 > 铁血 > 马拉松 > 默认
  if (upsets >= 5) {
    return {
      icon: '🔥',
      title: '冷门猎手',
      desc: `${upsets} 次爆冷，颠覆预期`,
    };
  }
  if (upsetRate < 0.1 && totalPicks >= 4) {
    return {
      icon: '👑',
      title: '共识之王',
      desc: '稳扎稳打，始终选择高种子',
    };
  }
  if (elapsed > 0 && elapsed < 180 && totalPicks >= 4) {
    return {
      icon: '⚡',
      title: '闪电裁决',
      desc: `${Math.round(elapsed / 60)} 分钟速通夺冠`,
    };
  }
  if (noUndo && totalPicks >= 4) {
    return {
      icon: '🛡️',
      title: '铁血裁判',
      desc: '全程零回退，每场决断如铁',
    };
  }
  if (bracketSize >= 128) {
    return {
      icon: '💯',
      title: '马拉松选手',
      desc: '完成 128 强全程鏖战',
    };
  }
  return {
    icon: '🎵',
    title: '音乐鉴赏家',
    desc: '完成本届赛事',
  };
}

// ---------- 跨会话战绩统计 ----------

const STATS_KEY = 'song_cup_stats';

/**
 * 加载跨会话战绩
 * @returns {object} 战绩对象
 */
export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return getDefaultStats();
    return { ...getDefaultStats(), ...JSON.parse(raw) };
  } catch {
    return getDefaultStats();
  }
}

/**
 * 保存跨会话战绩
 * @param {object} stats
 */
export function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* ignore quota / privacy errors */
  }
}

/**
 * 更新战绩（夺冠时调用）
 * @param {object} current - 当前战绩
 * @param {object} runInfo - 本届信息 { singerName, bracketSize, elapsed, upsets, mode }
 * @returns {object} 更新后的战绩
 */
export function updateStats(current, runInfo) {
  const stats = { ...current };
  stats.totalChampionships = (stats.totalChampionships || 0) + 1;
  stats.totalMatches = (stats.totalMatches || 0) + (runInfo.totalPicks || 0);
  stats.totalUpsets = (stats.totalUpsets || 0) + (runInfo.upsets || 0);

  // 最快夺冠记录
  if (runInfo.elapsed > 0) {
    if (!stats.bestTime || runInfo.elapsed < stats.bestTime) {
      stats.bestTime = runInfo.elapsed;
    }
  }

  // 歌手游玩次数
  const singer = runInfo.singerName || '未知';
  stats.singerPlayCount = { ...(stats.singerPlayCount || {}) };
  stats.singerPlayCount[singer] = (stats.singerPlayCount[singer] || 0) + 1;

  // 最常玩歌手
  let maxCount = 0;
  let mostPlayed = '';
  for (const [name, count] of Object.entries(stats.singerPlayCount)) {
    if (count > maxCount) {
      maxCount = count;
      mostPlayed = name;
    }
  }
  stats.mostPlayedSinger = mostPlayed;

  return stats;
}

function getDefaultStats() {
  return {
    totalChampionships: 0,
    totalMatches: 0,
    totalUpsets: 0,
    bestTime: null,
    mostPlayedSinger: '',
    singerPlayCount: {},
  };
}

// ---------- 成就定义 ----------

export const ACHIEVEMENTS = {
  first_champ: { icon: '🏆', title: '初登王座', desc: '赢得你的第一个冠军' },
  no_undo: { icon: '🛡️', title: '铁血裁判', desc: '全程未回退完成一届' },
  upset_master: { icon: '🔥', title: '冷门猎手', desc: '单届制造 5 次爆冷' },
  speed_demon: { icon: '⚡', title: '闪电裁决', desc: '3 分钟内夺冠' },
  full_128: { icon: '💯', title: '全满贯', desc: '完成 128 强马拉松' },
  cross_king: { icon: '🌐', title: '群雄割据', desc: '跨歌手混战夺冠' },
  wc_champ: { icon: '⚽', title: '世界之王', desc: '赢得世界杯冠军' },
  tier_done: { icon: '📊', title: '秩序守护', desc: '完成一次夯到拉排名' },
};

/**
 * 检测本届赛事应解锁的成就
 * @param {object} ctx - { mode, champion, history, bracketSize, noUndo, elapsed, isCrossBattle }
 * @returns {string[]} 新解锁的成就 key 数组
 */
export function detectAchievements(ctx) {
  const { mode, champion, history, bracketSize, noUndo, elapsed, isCrossBattle } = ctx;
  if (!champion) return [];

  const upsets = countUpsets(history);
  const totalPicks = history.filter((h) => h.phase !== 'group').length;
  const result = [];

  // first_champ: 总是检测（由 hook 判断是否已解锁）
  result.push('first_champ');

  // no_undo: 全程未回退且有足够场次
  if (noUndo && totalPicks >= 4) result.push('no_undo');

  // upset_master: 5 次以上爆冷
  if (upsets >= 5) result.push('upset_master');

  // speed_demon: 3 分钟内夺冠
  if (elapsed > 0 && elapsed < 180 && totalPicks >= 4) result.push('speed_demon');

  // full_128: 128 强夺冠
  if (bracketSize >= 128) result.push('full_128');

  // cross_king: 跨歌手混战夺冠
  if (isCrossBattle) result.push('cross_king');

  // wc_champ: 世界杯夺冠
  if (mode === 'wc') result.push('wc_champ');

  return result;
}
