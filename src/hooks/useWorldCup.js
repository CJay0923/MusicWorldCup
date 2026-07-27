// useWorldCup.js
// 世界杯模式(四选二小组赛 + 淘汰赛)的状态管理 Hook
//
// WC 状态结构:
//   wc = {
//     phase: "draw"|"group"|"wildcard"|"knockout"|"champion",
//     groups: [{ name, members[4], picks[], winner, runnerUp,
//                thirdPlace, fourthPlace, done }],
//     curGroup: number,
//     wildcards: [entrant...],   // 8 个外卡
//     ko: { rounds[6], curRound, curMatch, phase:"r32"|"r16"|"qf"|"sf"|"final" },
//     history: [{ phase, group, picks, winner, loser }],
//     champion: entrant | null,
//   }

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  WC_GROUPS,
  WC_GROUP_SIZE,
  WC_WILDCARDS,
  GROUP_LETTERS,
  WC_KO_TEAMS,
} from '../data/singers.js';
import { shuffleArr, bracketOrder } from '../utils/bracket.js';
import { slimE, restoreE } from '../utils/format.js';

const PICK_DELAY = 750;
const storageKey = (id) => 'song_cup_' + id + '_wc';
const KO_PHASES = ['r32', 'r16', 'qf', 'sf', 'final'];
const KO_ROUNDS = 6; // rounds[0..5]，比赛轮次为 0..4，rounds[5] 存放冠军

// ---------- 纯函数：抽签 ----------
// members 存储的是 entrant.id（索引数字），组件通过 entrants[idx] 查找
function makeDraw(singerData) {
  const entrants = singerData?.entrants || [];
  // 按 seedRank 升序，取前 48 名
  const sorted = [...entrants].sort((a, b) => (a.seedRank || 999) - (b.seedRank || 999));
  const top = sorted.slice(0, WC_GROUPS * WC_GROUP_SIZE); // 48

  // 4 个 pot，每个 pot 12 首：pot0=1-12, pot1=13-24, pot2=25-36, pot3=37-48
  const pots = [[], [], [], []];
  for (let i = 0; i < top.length; i++) pots[Math.floor(i / WC_GROUPS)].push(top[i].id);
  const shuffledPots = pots.map((p) => shuffleArr(p));

  // 12 组，每组从 4 个 pot 各抽 1 首（存储 id 索引）
  const groups = [];
  for (let g = 0; g < WC_GROUPS; g++) {
    groups.push({
      name: GROUP_LETTERS[g],
      members: [
        shuffledPots[0][g],
        shuffledPots[1][g],
        shuffledPots[2][g],
        shuffledPots[3][g],
      ],
      picks: [], // 四选二：用户选中的 member 索引（最多 2 个）
      winner: null,
      runnerUp: null,
      thirdPlace: null,
      fourthPlace: null,
      done: false,
    });
  }

  return {
    phase: 'draw',
    groups,
    curGroup: 0,
    wildcards: [],
    ko: { rounds: [], curRound: 0, curMatch: 0, phase: KO_PHASES[0] },
    history: [],
    champion: null,
  };
}

// ---------- 纯函数：按 seedRank 升序排序 member 索引 ----------
function rankByIdx(idxs, g, entrants) {
  return idxs.slice().sort((a, b) => {
    const ra = entrants[g.members[a]]?.seedRank || 999;
    const rb = entrants[g.members[b]]?.seedRank || 999;
    return ra - rb;
  });
}

// ---------- 纯函数：构建 32 队淘汰赛对阵 ----------
function buildKnockout(wc) {
  const winners = wc.groups.map((g) => g.winner).filter(Boolean); // 12
  const runnerUps = wc.groups.map((g) => g.runnerUp).filter(Boolean); // 12
  const all = winners.concat(runnerUps, wc.wildcards); // 32
  all.sort((a, b) => (a.seedRank || 999) - (b.seedRank || 999));

  // 用递归算法生成标准蛇形种子位（替换硬编码的 SEED_TO_POS_32）
  const order = bracketOrder(WC_KO_TEAMS);
  const placed = order.map((s) => all[s - 1]);

  // 构建歌曲 → 小组名 映射，用于避免同组首轮相遇
  const groupOf = {};
  wc.groups.forEach((g) => {
    [g.winner, g.runnerUp, g.thirdPlace, g.fourthPlace].forEach((e) => {
      if (e) groupOf[e.id] = g.name;
    });
  });

  // 两轮局部交换：尽量避免同组出线的两首歌在首轮相遇
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < placed.length; i += 2) {
      const a = placed[i],
        b = placed[i + 1];
      if (!a || !b) continue;
      if (groupOf[a.id] !== groupOf[b.id]) continue;
      // 同组相遇，尝试与另一对交换
      for (let j = 0; j < placed.length; j += 2) {
        if (j === i) continue;
        const c = placed[j],
          d = placed[j + 1];
        if (!c || !d) continue;
        // 交换 b 和 d，检查交换后两对都不再同组
        if (groupOf[a.id] !== groupOf[d.id] && groupOf[c.id] !== groupOf[b.id]) {
          placed[i + 1] = d;
          placed[j + 1] = b;
          break;
        }
      }
    }
  }

  const rounds = [placed];
  let sz = WC_KO_TEAMS;
  for (let r = 1; r < KO_ROUNDS; r++) {
    sz /= 2;
    rounds.push(new Array(sz).fill(null));
  }
  return { rounds, curRound: 0, curMatch: 0, phase: KO_PHASES[0] };
}

// ---------- 序列化 / 反序列化 ----------
function serializeWC(wc) {
  if (!wc) return null;
  const sE = (e) => (e ? slimE(e) : null);
  return {
    phase: wc.phase,
    groups: wc.groups.map((g) => ({
      name: g.name,
      members: g.members,
      picks: g.picks,
      winner: sE(g.winner),
      runnerUp: sE(g.runnerUp),
      thirdPlace: sE(g.thirdPlace),
      fourthPlace: sE(g.fourthPlace),
      done: g.done,
    })),
    curGroup: wc.curGroup,
    wildcards: wc.wildcards.map(sE),
    ko: {
      rounds: wc.ko.rounds.map((r) => r.map(sE)),
      curRound: wc.ko.curRound,
      curMatch: wc.ko.curMatch,
      phase: wc.ko.phase,
    },
    history: wc.history.map((h) => ({
      phase: h.phase,
      group: h.group,
      picks: (h.picks || []).map(sE),
      winner: sE(h.winner),
      loser: sE(h.loser),
      round: h.round,
      match: h.match,
    })),
    champion: sE(wc.champion),
  };
}

function deserializeWC(d) {
  if (!d) return null;
  const rE = (s) => (s ? restoreE(s) : null);
  return {
    phase: d.phase,
    groups: d.groups.map((g) => ({
      name: g.name,
      members: g.members,
      picks: g.picks || [],
      winner: rE(g.winner),
      runnerUp: rE(g.runnerUp),
      thirdPlace: rE(g.thirdPlace),
      fourthPlace: rE(g.fourthPlace),
      done: g.done,
    })),
    curGroup: d.curGroup,
    wildcards: (d.wildcards || []).map(rE),
    ko: {
      rounds: (d.ko?.rounds || []).map((r) => r.map(rE)),
      curRound: d.ko?.curRound ?? 0,
      curMatch: d.ko?.curMatch ?? 0,
      phase: d.ko?.phase ?? KO_PHASES[0],
    },
    history: (d.history || []).map((h) => ({
      phase: h.phase,
      group: h.group,
      picks: (h.picks || []).map(rE),
      winner: rE(h.winner),
      loser: rE(h.loser),
      round: h.round,
      match: h.match,
    })),
    champion: rE(d.champion),
  };
}

/**
 * @param {string} singerId - 歌手ID
 * @param {object} singerData - SINGERS[singerId]
 */
export function useWorldCup(singerId, singerData) {
  const [wc, setWc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [currentGroupResult, setCurrentGroupResult] = useState(null);
  // 最近一次选择，供组件播放胜负高亮动画
  const [lastPick, setLastPick] = useState(null);

  const timerRef = useRef(null);
  const prevSingerRef = useRef(singerId);

  // 歌手切换时重置
  useEffect(() => {
    if (singerId === prevSingerRef.current) return;
    prevSingerRef.current = singerId;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setWc(null);
    setBusy(false);
    setShowTransition(false);
    setCurrentGroupResult(null);
    setLastPick(null);
  }, [singerId]);

  // 卸载时清理定时器
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // ---------- localStorage ----------
  const saveWC = useCallback(
    (wcVal) => {
      try {
        localStorage.setItem(storageKey(singerId), JSON.stringify(serializeWC(wcVal)));
      } catch {
        /* ignore */
      }
    },
    [singerId],
  );

  const loadSavedWC = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey(singerId));
      if (!raw) return null;
      return deserializeWC(JSON.parse(raw));
    } catch {
      return null;
    }
  }, [singerId]);

  const hasSavedWC = useCallback(() => {
    try {
      return !!localStorage.getItem(storageKey(singerId));
    } catch {
      return false;
    }
  }, [singerId]);

  // ---------- 控制 ----------
  const startWorldCup = useCallback(
    (useSaved) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (useSaved) {
        const saved = loadSavedWC();
        if (saved) {
          setWc(saved);
          setBusy(false);
          setShowTransition(false);
          setCurrentGroupResult(null);
          setLastPick(null);
          return;
        }
      }
      setWc(makeDraw(singerData));
      setBusy(false);
      setShowTransition(false);
      setCurrentGroupResult(null);
      setLastPick(null);
    },
    [loadSavedWC, singerData],
  );

  const resetWC = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      localStorage.removeItem(storageKey(singerId));
    } catch {
      /* ignore */
    }
    setWc(makeDraw(singerData));
    setBusy(false);
    setShowTransition(false);
    setCurrentGroupResult(null);
    setLastPick(null);
  }, [singerId, singerData]);

  // 从抽签结果进入小组赛
  const proceedFromDraw = useCallback(() => {
    if (!wc || wc.phase !== 'draw') return;
    const next = { ...wc, phase: 'group', curGroup: 0 };
    setWc(next);
    saveWC(next);
  }, [wc, saveWC]);

  /**
   * 四选二：切换当前组内某首歌的选中状态（最多选 2 首）
   * @param {number} memberIdx - 组内成员索引 (0..3)
   */
  const wcTogglePick = useCallback(
    (memberIdx) => {
      if (busy) return;
      if (!wc || wc.phase !== 'group') return;
      const g = wc.groups[wc.curGroup];
      if (!g || g.done) return;

      const newGroups = wc.groups.slice();
      const ng = { ...g, picks: g.picks.slice() };
      const pos = ng.picks.indexOf(memberIdx);
      if (pos >= 0) {
        ng.picks.splice(pos, 1);
      } else {
        if (ng.picks.length >= 2) return; // 最多 2 个
        ng.picks.push(memberIdx);
      }
      newGroups[wc.curGroup] = ng;
      const newWc = { ...wc, groups: newGroups };
      setWc(newWc);
      saveWC(newWc);
    },
    [busy, wc, saveWC],
  );

  /**
   * 四选二：确认当前组的选择（必须已选满 2 首）
   * 排名规则：选中的 2 首按 seedRank 升序 → 小组第一/第二
   *          未选中的 2 首按 seedRank 升序 → 小组第三/第四
   */
  const wcConfirmPicks = useCallback(() => {
    if (busy) return;
    if (!wc || wc.phase !== 'group') return;
    const g = wc.groups[wc.curGroup];
    if (!g || g.done) return;
    if (g.picks.length !== 2) return;

    const [wIdx, rIdx] = rankByIdx(g.picks, g, singerData.entrants);
    const unpicked = [0, 1, 2, 3].filter((i) => !g.picks.includes(i));
    const [tIdx, fIdx] = rankByIdx(unpicked, g, singerData.entrants);

    const winner = singerData.entrants[g.members[wIdx]];
    const runnerUp = singerData.entrants[g.members[rIdx]];
    const thirdPlace = singerData.entrants[g.members[tIdx]];
    const fourthPlace = singerData.entrants[g.members[fIdx]];

    const ng = {
      ...g,
      winner,
      runnerUp,
      thirdPlace,
      fourthPlace,
      done: true,
    };
    const newGroups = wc.groups.slice();
    newGroups[wc.curGroup] = ng;

    const allDone = newGroups.every((x) => x.done);

    const newWc = {
      ...wc,
      groups: newGroups,
      history: wc.history.concat({
        phase: 'group',
        group: g.name,
        picks: [winner, runnerUp], // 两首出线歌曲（用于冠军之路展示）
        winner, // 兼容字段：seedRank 更优的出线者
        loser: runnerUp, // 兼容字段：另一名出线者
      }),
    };
    setWc(newWc);
    setBusy(true);
    setCurrentGroupResult({
      name: ng.name,
      winner: ng.winner,
      runnerUp: ng.runnerUp,
      thirdPlace: ng.thirdPlace,
      allDone,
    });
    setShowTransition(true);
    saveWC(newWc);
    // busy 保持为 true，直到 proceedFromGroupResult
  }, [busy, wc, saveWC, singerData]);

  // 从小组结果继续：进入下一组 或 进入外卡阶段
  const proceedFromGroupResult = useCallback(() => {
    if (!wc) return;
    const allDone = wc.groups.every((x) => x.done);
    let next;
    if (allDone) {
      // 12 个第三名按 seedRank 排序取前 8 作为外卡
      const thirds = wc.groups.map((g) => g.thirdPlace).filter(Boolean);
      thirds.sort((a, b) => (a.seedRank || 999) - (b.seedRank || 999));
      const wildcards = thirds.slice(0, WC_WILDCARDS);
      next = { ...wc, phase: 'wildcard', wildcards };
    } else {
      let ng = wc.curGroup + 1;
      while (ng < wc.groups.length && wc.groups[ng].done) ng++;
      next = { ...wc, curGroup: ng };
    }
    setWc(next);
    setShowTransition(false);
    setCurrentGroupResult(null);
    setBusy(false);
    setLastPick(null);
    saveWC(next);
  }, [wc, saveWC]);

  // 从外卡阶段进入淘汰赛
  const proceedFromWildcard = useCallback(() => {
    if (!wc || wc.phase !== 'wildcard') return;
    const ko = buildKnockout(wc);
    const next = { ...wc, phase: 'knockout', ko };
    setWc(next);
    setShowTransition(false);
    setBusy(false);
    setLastPick(null);
    saveWC(next);
  }, [wc, saveWC]);

  /**
   * 淘汰赛选择
   * @param {0|1} slot
   */
  const koPick = useCallback(
    (slot) => {
      if (busy) return;
      if (!wc || wc.phase !== 'knockout') return;
      const ko = wc.ko;
      const a = ko.rounds[ko.curRound]?.[ko.curMatch * 2];
      const b = ko.rounds[ko.curRound]?.[ko.curMatch * 2 + 1];
      if (!a || !b) return;

      const winner = slot === 0 ? a : b;
      const loser = slot === 0 ? b : a;

      const newRounds = ko.rounds.slice();
      newRounds[ko.curRound + 1] = newRounds[ko.curRound + 1].slice();
      newRounds[ko.curRound + 1][ko.curMatch] = winner;

      const matchesInRound = newRounds[ko.curRound].length / 2;
      const capturedRound = ko.curRound;
      const capturedMatch = ko.curMatch;

      const baseWc = {
        ...wc,
        ko: { ...ko, rounds: newRounds },
        history: wc.history.concat({
          phase: ko.phase,
          round: ko.curRound,
          match: ko.curMatch,
          winner,
          loser,
        }),
      };
      setWc(baseWc);
      setBusy(true);
      setLastPick({
        phase: ko.phase,
        round: ko.curRound,
        match: ko.curMatch,
        slot,
        winner,
        loser,
      });

      timerRef.current = setTimeout(() => {
        let nextRound = capturedRound;
        let nextMatch = capturedMatch + 1;
        let isChampion = false;
        let transition = false;

        if (nextMatch >= matchesInRound) {
          nextRound = capturedRound + 1;
          nextMatch = 0;
          if (nextRound >= KO_ROUNDS - 1) {
            // 决赛(round 4)结束后 nextRound=5，冠军产生
            isChampion = true;
          } else {
            transition = true;
          }
        }

        const updatedKo = {
          rounds: newRounds,
          curRound: nextRound,
          curMatch: nextMatch,
          phase: nextRound >= KO_ROUNDS - 1 ? 'champion' : KO_PHASES[nextRound],
        };

        let next;
        if (isChampion) {
          const champ = newRounds[KO_ROUNDS - 1]?.[0] || winner;
          next = { ...baseWc, ko: updatedKo, phase: 'champion', champion: champ };
        } else {
          next = { ...baseWc, ko: updatedKo };
        }
        setWc(next);
        saveWC(next);

        if (transition) {
          setShowTransition(true);
          // busy 保持为 true，直到 dismissTransition
        } else {
          setBusy(false);
        }
      }, PICK_DELAY);
    },
    [busy, wc, saveWC],
  );

  const dismissTransition = useCallback(() => {
    setShowTransition(false);
    setBusy(false);
  }, []);

  /**
   * 回退上一步（撤销最后一次 wcConfirmPicks / koPick）
   */
  const undoWC = useCallback(() => {
    if (busy) return;
    if (!wc || wc.history.length === 0) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const lastEntry = wc.history[wc.history.length - 1];
    const newHistory = wc.history.slice(0, -1);

    let newWc = { ...wc, history: newHistory };

    if (KO_PHASES.includes(lastEntry.phase)) {
      // ---- 回退淘汰赛 ----
      const ko = wc.ko;
      const newRounds = ko.rounds.map((r) => r.slice());
      const roundIdx = lastEntry.round;
      const matchIdx = lastEntry.match ?? 0;

      if (newRounds[roundIdx + 1]) {
        newRounds[roundIdx + 1][matchIdx] = null;
      }

      newWc = {
        ...newWc,
        phase: 'knockout',
        champion: null,
        ko: {
          ...ko,
          rounds: newRounds,
          curRound: roundIdx,
          curMatch: matchIdx,
          phase: KO_PHASES[roundIdx],
        },
      };
    } else if (lastEntry.phase === 'group') {
      // ---- 回退四选二小组赛 ----
      const groupIdx = wc.groups.findIndex((g) => g.name === lastEntry.group);
      if (groupIdx < 0) return;

      const g = wc.groups[groupIdx];
      const newGroups = wc.groups.slice();
      newGroups[groupIdx] = {
        ...g,
        picks: [],
        winner: null,
        runnerUp: null,
        thirdPlace: null,
        fourthPlace: null,
        done: false,
      };

      newWc = {
        ...newWc,
        phase: 'group',
        curGroup: groupIdx,
        groups: newGroups,
      };
    }

    setWc(newWc);
    setBusy(false);
    setShowTransition(false);
    setCurrentGroupResult(null);
    setLastPick(null);
    saveWC(newWc);
  }, [busy, wc, saveWC]);

  const phase = wc?.phase || null;
  const champion = wc?.champion || null;

  return {
    wc,
    phase,
    champion,
    busy,
    lastPick,
    startWorldCup,
    wcTogglePick,
    wcConfirmPicks,
    koPick,
    undoWC,
    proceedFromDraw,
    proceedFromGroupResult,
    proceedFromWildcard,
    resetWC,
    hasSavedWC,
    showTransition,
    dismissTransition,
    currentGroupResult,
  };
}

export default useWorldCup;
