// src/hooks/useAchievements.js
// 成就系统 Hook — 纯观察模式，不修改核心状态机
//
// 观察 gameState / wcState 的 champion 字段，在冠军产生时检测成就解锁。
// 持久化到 localStorage('song_cup_achievements')。
//
// 接入方式（零侵入）：
//   const { unlocked, newAchievements, dismissNew } = useAchievements({
//     mode, champion, history, bracketSize, noUndo, elapsed, isCrossBattle
//   });

import { useState, useEffect, useCallback, useRef } from 'react';
import { detectAchievements } from '../utils/playstyle.js';

const ACH_KEY = 'song_cup_achievements';

function loadUnlocked() {
  try {
    const raw = localStorage.getItem(ACH_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveUnlocked(obj) {
  try {
    localStorage.setItem(ACH_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

/**
 * @param {object} ctx
 * @param {string} ctx.mode - 当前模式 ('classic' | 'wc' | 'custom' | 'cross-battle' | 'ranking')
 * @param {object|null} ctx.champion - 冠军对象（null 表示未产生）
 * @param {Array} ctx.history - 历史记录数组
 * @param {number} ctx.bracketSize - 签表规模
 * @param {boolean} ctx.noUndo - 本届是否未使用回退
 * @param {number} ctx.elapsed - 本届耗时（秒）
 * @param {boolean} ctx.isCrossBattle - 是否跨歌手混战
 * @param {boolean} ctx.isRankingDone - 排名模式是否完成
 * @returns {{ unlocked: object, newAchievements: string[], dismissNew: () => void }}
 */
export function useAchievements(ctx) {
  const {
    mode,
    champion,
    history,
    bracketSize,
    noUndo,
    elapsed,
    isCrossBattle,
    isRankingDone,
  } = ctx;

  const [unlocked, setUnlocked] = useState(loadUnlocked);
  const [newAchievements, setNewAchievements] = useState([]);
  // 记录上一次检测的 champion id，避免重复触发
  const lastChampIdRef = useRef(null);

  // 核心检测逻辑：champion 变化或 ranking 完成时触发
  useEffect(() => {
    const champId = champion?.id;

    // 排名模式完成
    if (isRankingDone && !unlocked.tier_done) {
      const next = { ...unlocked, tier_done: true };
      setUnlocked(next);
      saveUnlocked(next);
      setNewAchievements(['tier_done']);
      return;
    }

    // 冠军产生且与上次不同
    if (!champion || champId === lastChampIdRef.current) return;
    lastChampIdRef.current = champId;

    const detected = detectAchievements({
      mode,
      champion,
      history,
      bracketSize,
      noUndo,
      elapsed,
      isCrossBattle,
    });

    // 过滤已解锁的
    const fresh = detected.filter((key) => !unlocked[key]);
    if (fresh.length === 0) return;

    const next = { ...unlocked };
    for (const key of fresh) next[key] = true;
    setUnlocked(next);
    saveUnlocked(next);
    setNewAchievements(fresh);
  }, [
    champion,
    isRankingDone,
    mode,
    history,
    bracketSize,
    noUndo,
    elapsed,
    isCrossBattle,
    unlocked,
  ]);

  const dismissNew = useCallback(() => {
    setNewAchievements([]);
  }, []);

  return { unlocked, newAchievements, dismissNew };
}

export default useAchievements;
