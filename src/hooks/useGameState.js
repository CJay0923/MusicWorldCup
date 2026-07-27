// useGameState.js
// 经典淘汰赛模式的状态管理 Hook
// 管理 rounds(二维数组)、curRound、curMatch、history、busy 等状态，
// 并负责 localStorage 持久化与 750ms 的胜负过渡动画时序。

import { useCallback, useEffect, useRef, useState } from 'react';
import { freshRounds, generateRoundNames } from '../utils/bracket.js';
import { slimE, restoreE } from '../utils/format.js';

const PICK_DELAY = 750;
const storageKey = (id) => 'song_cup_' + id;

/**
 * @param {string} singerId - 歌手ID (stefanie / jj)
 * @param {object} singerData - SINGERS[singerId]，包含 { name, bracketSize, entrants, seeds, seedRank }
 */
export function useGameState(singerId, singerData) {
  const bracketSize = singerData?.bracketSize || 128;
  const entrants = singerData?.entrants || [];
  const seeds = singerData?.seeds || [];

  // 总轮数 = log2(bracketSize)。rounds 数组长度为 NUM_ROUNDS+1，
  // 其中 rounds[0..NUM_ROUNDS-1] 为比赛轮次，rounds[NUM_ROUNDS] 存放冠军。
  const NUM_ROUNDS = Math.log2(bracketSize);
  const roundNames = generateRoundNames(bracketSize); // ["128强","64强",...,"决赛"]
  const totalMatches = bracketSize - 1;

  const [rounds, setRounds] = useState(() => freshRounds(bracketSize, entrants, seeds));
  const [curRound, setCurRound] = useState(0);
  const [curMatch, setCurMatch] = useState(0);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [champion, setChampion] = useState(null);
  // 最近一次选择，供组件播放胜负高亮动画（对应"设置win/lose状态"）
  const [lastPick, setLastPick] = useState(null);

  const timerRef = useRef(null);
  const prevSingerRef = useRef(singerId);

  // 歌手切换时重置整盘
  useEffect(() => {
    if (singerId === prevSingerRef.current) return;
    prevSingerRef.current = singerId;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setRounds(freshRounds(bracketSize, entrants, seeds));
    setCurRound(0);
    setCurMatch(0);
    setHistory([]);
    setBusy(false);
    setShowTransition(false);
    setChampion(null);
    setLastPick(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singerId]);

  // 卸载时清理定时器
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // ---------- localStorage 持久化 ----------
  const saveState = useCallback((roundsVal, cr, cm, hist, done) => {
    try {
      const payload = {
        rounds: roundsVal.map((r) => r.map((s) => (s ? slimE(s) : null))),
        curRound: cr,
        curMatch: cm,
        history: hist.map((h) => ({
          round: h.round,
          roundName: h.roundName,
          winner: h.winner ? slimE(h.winner) : null,
          loser: h.loser ? slimE(h.loser) : null,
        })),
        done: !!done,
      };
      localStorage.setItem(storageKey(singerId), JSON.stringify(payload));
    } catch (e) {
      /* ignore quota / privacy errors */
    }
  }, [singerId]);

  const loadSaved = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey(singerId));
      if (!raw) return null;
      const d = JSON.parse(raw);
      const rs = (s) => (s ? restoreE(s) : null);
      return {
        rounds: d.rounds.map((r) => r.map(rs)),
        curRound: typeof d.curRound === 'number' ? d.curRound : 0,
        curMatch: typeof d.curMatch === 'number' ? d.curMatch : 0,
        history: (d.history || []).map((h) => ({
          round: h.round,
          roundName: h.roundName,
          winner: rs(h.winner),
          loser: rs(h.loser),
        })),
        done: !!d.done,
      };
    } catch (e) {
      return null;
    }
  }, [singerId]);

  const hasSaved = useCallback(() => {
    try {
      return !!localStorage.getItem(storageKey(singerId));
    } catch (e) {
      return false;
    }
  }, [singerId]);

  // ---------- 控制 ----------
  const startGame = useCallback((useSaved) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (useSaved) {
      const saved = loadSaved();
      if (saved) {
        setRounds(saved.rounds);
        setCurRound(saved.curRound);
        setCurMatch(saved.curMatch);
        setHistory(saved.history);
        setBusy(false);
        setShowTransition(false);
        setChampion(saved.done ? saved.rounds[NUM_ROUNDS]?.[0] || null : null);
        setLastPick(null);
        return;
      }
    }
    setRounds(freshRounds(bracketSize, entrants, seeds));
    setCurRound(0);
    setCurMatch(0);
    setHistory([]);
    setBusy(false);
    setShowTransition(false);
    setChampion(null);
    setLastPick(null);
  }, [loadSaved, bracketSize, entrants, seeds, NUM_ROUNDS]);

  const resetState = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      localStorage.removeItem(storageKey(singerId));
    } catch (e) {
      /* ignore */
    }
    setRounds(freshRounds(bracketSize, entrants, seeds));
    setCurRound(0);
    setCurMatch(0);
    setHistory([]);
    setBusy(false);
    setShowTransition(false);
    setChampion(null);
    setLastPick(null);
  }, [singerId, bracketSize, entrants, seeds]);

  /**
   * 选择某一侧胜出
   * @param {0|1} slot 0=左侧, 1=右侧
   */
  const pick = useCallback((slot) => {
    if (busy) return;
    const a = rounds[curRound]?.[curMatch * 2];
    const b = rounds[curRound]?.[curMatch * 2 + 1];
    if (!a || !b) return;

    const winner = slot === 0 ? a : b;
    const loser = slot === 0 ? b : a;

    // 写入下一轮对应位置
    const newRounds = rounds.slice();
    newRounds[curRound + 1] = newRounds[curRound + 1].slice();
    newRounds[curRound + 1][curMatch] = winner;

    const newHistory = history.concat({
      round: curRound,
      roundName: roundNames[curRound],
      winner,
      loser,
    });

    setRounds(newRounds);
    setHistory(newHistory);
    setBusy(true);
    setLastPick({ round: curRound, match: curMatch, slot, winner, loser });

    const matchesInThisRound = newRounds[curRound].length / 2;
    const capturedRound = curRound;
    const capturedMatch = curMatch;

    timerRef.current = setTimeout(() => {
      let nextRound = capturedRound;
      let nextMatch = capturedMatch + 1;

      if (nextMatch >= matchesInThisRound) {
        // 当前轮结束
        nextRound = capturedRound + 1;
        nextMatch = 0;
        if (nextRound >= NUM_ROUNDS) {
          // 决赛结束，产生冠军
          const champ = newRounds[nextRound]?.[0] || winner;
          setChampion(champ);
          setCurRound(nextRound);
          setCurMatch(nextMatch);
          saveState(newRounds, nextRound, nextMatch, newHistory, true);
          setBusy(false);
          return;
        }
        // 进入下一轮，显示轮次过渡
        setCurRound(nextRound);
        setCurMatch(nextMatch);
        saveState(newRounds, nextRound, nextMatch, newHistory, false);
        setShowTransition(true);
        // busy 保持为 true，直到 dismissTransition
        return;
      }

      // 同轮下一场
      setCurRound(nextRound);
      setCurMatch(nextMatch);
      saveState(newRounds, nextRound, nextMatch, newHistory, false);
      setBusy(false);
    }, PICK_DELAY);
  }, [busy, rounds, curRound, curMatch, history, roundNames, NUM_ROUNDS, saveState]);

  const dismissTransition = useCallback(() => {
    setShowTransition(false);
    setBusy(false);
  }, []);

  // 当前对局的两位选手
  const currentMatchPair = (() => {
    if (curRound >= NUM_ROUNDS || !rounds[curRound]) return [null, null];
    const a = rounds[curRound][curMatch * 2];
    const b = rounds[curRound][curMatch * 2 + 1];
    return [a || null, b || null];
  })();

  return {
    rounds,
    curRound,
    curMatch,
    history,
    busy,
    champion,
    roundNames,
    bracketSize,
    totalMatches,
    numRounds: NUM_ROUNDS,
    currentMatchPair,
    lastPick,
    startGame,
    pick,
    resetState,
    hasSaved,
    showTransition,
    dismissTransition,
  };
}

export default useGameState;
