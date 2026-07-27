// App.jsx — 主应用组件
// 整合 useGameState / useWorldCup / useAudioPlayer 三个 hook，
// 根据当前歌手、模式和游戏阶段渲染对应的界面。

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SINGERS, buildCustomSingerData, classicOptions } from './data/singers.js';
import { useGameState } from './hooks/useGameState.js';
import { useWorldCup } from './hooks/useWorldCup.js';
import { useAudioPlayer } from './hooks/useAudioPlayer.js';
import StartScreen from './components/StartScreen.jsx';
import MatchStage from './components/MatchStage.jsx';
import ChampionScreen from './components/ChampionScreen.jsx';
import ChampionShare from './components/ChampionShare.jsx';
import AudioPlayer from './components/AudioPlayer.jsx';
import RoundOverlay from './components/RoundOverlay.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import WCPhaseBar from './components/wc/WCPhaseBar.jsx';
import GroupStandings from './components/wc/GroupStandings.jsx';
import DrawScreen from './components/wc/DrawScreen.jsx';
import WildcardScreen from './components/wc/WildcardScreen.jsx';
import GroupResultScreen from './components/wc/GroupResultScreen.jsx';
import KOBracket from './components/wc/KOBracket.jsx';
import { WC_TOTAL_MATCHES, WC_KO_TEAMS } from './data/singers.js';

const KO_ROUND_NAMES = ['32强', '16强', '8强', '4强', '决赛'];
const KO_ROUND_ICONS = ['🔥', '⚡', '💪', '💪', '🏆'];

function App() {
  const [currentSinger, setCurrentSinger] = useState('stefanie');
  const [selectedMode, setSelectedMode] = useState('classic');
  const [selectedSize, setSelectedSize] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [customSelectedIds, setCustomSelectedIds] = useState(new Set());
  const confettiRef = useRef(null);

  const baseSingerData = SINGERS[currentSinger];
  const isCustom = selectedMode === 'custom';

  // 自选模式：从选中的 entrant 构建数据
  const customEntrants = useMemo(() => {
    if (!isCustom || !baseSingerData) return [];
    return baseSingerData.entrants.filter((e) => customSelectedIds.has(e.id));
  }, [isCustom, baseSingerData, customSelectedIds]);

  const customValidCount = customEntrants.length;
  const customAvailableSizes = classicOptions(customValidCount);
  const customBracketSize =
    selectedSize && customAvailableSizes.includes(selectedSize)
      ? selectedSize
      : customAvailableSizes[0] || 4;

  const customSingerData = useMemo(() => {
    if (!isCustom) return null;
    return buildCustomSingerData(customEntrants, customBracketSize, baseSingerData?.name);
  }, [isCustom, customEntrants, customBracketSize, baseSingerData]);

  // 当前生效的歌手数据 / 歌手 ID / 规模
  const singerData = isCustom && customSingerData ? customSingerData : baseSingerData;
  const effectiveSingerId = isCustom ? 'custom' : currentSinger;

  // 经典模式可选规模（根据歌手可用歌曲数动态计算）
  const maxBracket = baseSingerData?.bracketSize || 128;
  const availableSizes = classicOptions(maxBracket);
  const classicSize = selectedSize || availableSizes[0] || maxBracket;

  const gameState = useGameState(
    effectiveSingerId,
    singerData,
    isCustom ? customBracketSize : classicSize,
  );
  const wcState = useWorldCup(currentSinger, baseSingerData);
  const audio = useAudioPlayer();

  // ---------- 是否处于冠军界面 ----------
  const isChampion =
    selectedMode === 'wc' ? wcState.phase === 'champion' : !!gameState.champion;

  // ---------- 获取当前对局 ----------
  const getCurrentMatchPair = useCallback(() => {
    if (selectedMode === 'wc') {
      const wc = wcState.wc;
      if (!wc) return [null, null];
      if (wc.phase === 'group') {
        const g = wc.groups[wc.curGroup];
        if (!g || g.done) return [null, null];
        const [i, j] = g.schedule[g.curMatch];
        const a = singerData.entrants[g.members[i]];
        const b = singerData.entrants[g.members[j]];
        return [a || null, b || null];
      }
      if (wc.phase === 'knockout') {
        const ko = wc.ko;
        if (!ko?.rounds?.length) return [null, null];
        const a = ko.rounds[ko.curRound]?.[ko.curMatch * 2];
        const b = ko.rounds[ko.curRound]?.[ko.curMatch * 2 + 1];
        return [a || null, b || null];
      }
      return [null, null];
    }
    return gameState.currentMatchPair;
  }, [selectedMode, wcState.wc, singerData.entrants, gameState.currentMatchPair]);

  const [leftE, rightE] = getCurrentMatchPair();

  // ---------- 卡片状态 ----------
  const getCardState = useCallback(
    (slot) => {
      const isWC = selectedMode === 'wc';
      const lp = isWC ? wcState.lastPick : gameState.lastPick;
      const isBusy = isWC ? wcState.busy : gameState.busy;
      if (isBusy && lp) return lp.slot === slot ? 'win' : 'lose';
      if (isBusy) return 'locked';
      return 'default';
    },
    [selectedMode, wcState.lastPick, wcState.busy, gameState.lastPick, gameState.busy],
  );

  // ---------- 选择胜者 ----------
  const handlePick = useCallback(
    (slot) => {
      if (selectedMode === 'wc') {
        if (wcState.phase === 'group') wcState.wcPick(slot);
        else if (wcState.phase === 'knockout') wcState.koPick(slot);
      } else {
        gameState.pick(slot);
      }
    },
    [selectedMode, wcState, gameState],
  );

  // ---------- 试听 ----------
  const handlePreview = useCallback(
    (slot) => {
      const pair = getCurrentMatchPair();
      const ent = slot === 0 ? pair[0] : pair[1];
      if (ent) audio.openAudition(ent, baseSingerData.name);
    },
    [getCurrentMatchPair, audio, baseSingerData],
  );

  // ---------- 开始 / 继续 / 重置 ----------
  const handleStart = useCallback(() => {
    setGameStarted(true);
    if (selectedMode === 'wc') wcState.startWorldCup(false);
    else gameState.startGame(false);
  }, [selectedMode, wcState, gameState]);

  const handleResume = useCallback(() => {
    setGameStarted(true);
    if (selectedMode === 'wc') wcState.startWorldCup(true);
    else gameState.startGame(true);
  }, [selectedMode, wcState, gameState]);

  const handleAgain = useCallback(() => {
    if (selectedMode === 'wc') wcState.resetWC();
    else gameState.resetState();
  }, [selectedMode, wcState, gameState]);

  const handleReset = useCallback(() => {
    setGameStarted(false);
    if (selectedMode === 'wc') wcState.resetWC();
    else gameState.resetState();
  }, [selectedMode, wcState, gameState]);

  // ---------- 回退上一场 ----------
  const handleUndo = useCallback(() => {
    if (selectedMode === 'wc') wcState.undoWC();
    else gameState.undo();
  }, [selectedMode, wcState, gameState]);

  // ---------- 是否可以回退 ----------
  const canUndo = (() => {
    if (!gameStarted || isChampion) return false;
    const isBusy = selectedMode === 'wc' ? wcState.busy : gameState.busy;
    if (isBusy) return false;
    if (selectedMode === 'wc') {
      if (!wcState.wc) return false;
      const overlayShown =
        wcState.showTransition ||
        !!wcState.currentGroupResult ||
        wcState.wc.phase === 'draw' ||
        wcState.wc.phase === 'wildcard';
      if (overlayShown) return false;
      return wcState.wc.history.length > 0;
    }
    if (gameState.showTransition) return false;
    return gameState.history.length > 0;
  })();

  // ---------- 歌手 / 模式切换 ----------
  const handleSelectSinger = useCallback(
    (id) => {
      if (id === currentSinger) return;
      setCurrentSinger(id);
      setSelectedSize(null);
      setGameStarted(false);
      setCustomSelectedIds(new Set());
    },
    [currentSinger],
  );

  const handleSelectMode = useCallback(
    (mode) => {
      if (mode === selectedMode) return;
      setSelectedMode(mode);
      // 切换模式时重置规模和游戏状态
      setSelectedSize(null);
      setGameStarted(false);
    },
    [selectedMode],
  );

  const handleSelectSize = useCallback((size) => {
    setSelectedSize(size);
  }, []);

  // ---------- 进度条 seek ----------
  const seekHandler = useCallback(
    (e) => {
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audio.seek(pct);
    },
    [audio],
  );

  // ---------- 键盘 ----------
  useEffect(() => {
    const handler = (e) => {
      // Escape 关闭播放器
      if (e.key === 'Escape' && audio.visible) {
        audio.closePlayer();
        return;
      }
      if (audio.visible) return;

      // Enter 处理各类浮层
      if (e.key === 'Enter') {
        if (selectedMode === 'wc') {
          if (wcState.currentGroupResult) {
            wcState.proceedFromGroupResult();
            return;
          }
          if (wcState.wc?.phase === 'draw') {
            wcState.proceedFromDraw();
            return;
          }
          if (wcState.wc?.phase === 'wildcard') {
            wcState.proceedFromWildcard();
            return;
          }
        }
        if (gameState.showTransition) {
          gameState.dismissTransition();
          return;
        }
        if (wcState.showTransition) {
          wcState.dismissTransition();
          return;
        }
      }

      // 判断是否可操作
      const isBusy = selectedMode === 'wc' ? wcState.busy : gameState.busy;
      const overlayShown =
        selectedMode === 'wc'
          ? wcState.showTransition ||
            !!wcState.currentGroupResult ||
            wcState.wc?.phase === 'draw' ||
            wcState.wc?.phase === 'wildcard'
          : gameState.showTransition;
      if (isBusy || overlayShown || isChampion || !gameStarted) return;

      // 判断是否在可选择的阶段
      const canPick =
        selectedMode === 'wc'
          ? wcState.phase === 'group' || wcState.phase === 'knockout'
          : true;
      if (!canPick) return;

      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handlePick(0);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handlePick(1);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [audio, selectedMode, wcState, gameState, isChampion, gameStarted, handlePick]);

  // ---------- 进度条数据 ----------
  const progData = (() => {
    if (!gameStarted || isChampion) return null;

    if (selectedMode === 'wc' && wcState.wc) {
      const wc = wcState.wc;
      if (wc.phase === 'group') {
        const g = wc.groups[wc.curGroup];
        return {
          roundName: `${g?.name || ''}组`,
          matchIdx: (g?.curMatch || 0) + 1,
          matchTotal: 6,
          doneCnt: wc.history.length,
          progTotal: WC_TOTAL_MATCHES,
        };
      }
      if (wc.phase === 'knockout') {
        const ko = wc.ko;
        const matchesInRound = ko?.rounds?.[ko.curRound]?.length / 2 || 1;
        return {
          roundName: KO_ROUND_NAMES[ko?.curRound] || '淘汰赛',
          matchIdx: (ko?.curMatch || 0) + 1,
          matchTotal: matchesInRound,
          doneCnt: wc.history.length,
          progTotal: WC_TOTAL_MATCHES,
        };
      }
      return null;
    }

    // classic
    const matchesInRound = gameState.rounds[gameState.curRound]?.length / 2 || 1;
    return {
      roundName: gameState.roundNames[gameState.curRound] || '',
      matchIdx: gameState.curMatch + 1,
      matchTotal: matchesInRound,
      doneCnt: gameState.history.length,
      progTotal: gameState.totalMatches,
    };
  })();

  // ---------- 轮次过渡浮层数据 ----------
  const transitionData = (() => {
    if (selectedMode === 'wc' && wcState.showTransition && !wcState.currentGroupResult) {
      const wc = wcState.wc;
      if (wc?.phase === 'knockout') {
        const ko = wc.ko;
        const rn = KO_ROUND_NAMES[ko.curRound] || '淘汰赛';
        const remaining = ko.rounds[ko.curRound]?.filter(Boolean).length || 0;
        return {
          icon: KO_ROUND_ICONS[ko.curRound] || '🔥',
          title: `进入 ${rn}`,
          sub: `剩余 ${remaining} 首歌曲晋级`,
        };
      }
    }
    if (selectedMode !== 'wc' && gameState.showTransition) {
      const rn = gameState.roundNames[gameState.curRound] || '';
      const remaining = gameState.rounds[gameState.curRound]?.filter(Boolean).length || 0;
      const isFinal = gameState.curRound === gameState.numRounds - 1;
      return {
        icon: isFinal ? '🏆' : '🔥',
        title: `进入 ${rn}`,
        sub: `剩余 ${remaining} 首歌曲晋级`,
      };
    }
    return null;
  })();

  // ---------- WC 阶段栏数据 ----------
  const wcBarProps = (() => {
    if (selectedMode !== 'wc' || !wcState.wc) return null;
    const wc = wcState.wc;
    if (wc.phase === 'group') {
      return {
        phase: '小组赛',
        groups: wc.groups,
        curGroup: wc.curGroup,
        koMode: false,
      };
    }
    if (wc.phase === 'knockout') {
      return {
        phase: '淘汰赛',
        groups: wc.groups,
        curGroup: wc.curGroup,
        koMode: true,
        koCurRound: wc.ko.curRound,
        koPhase: wc.ko.phase,
      };
    }
    return null;
  })();

  // ---------- 是否显示比赛舞台 ----------
  const showStage =
    gameStarted &&
    !isChampion &&
    (selectedMode === 'wc'
      ? wcState.phase === 'group' || wcState.phase === 'knockout'
      : true);

  // ---------- chorusPct ----------
  const chorusPct =
    audio.duration > 0 && audio.chorusTime != null
      ? (audio.chorusTime / audio.duration) * 100
      : 0;

  // ==================== 渲染 ====================
  return (
    <div className="wrap">
      {/* 顶栏 */}
      <div className="topbar">
        <div className="brand">
          <span className="cup">🏆</span>
          <span>
            {singerData.name}歌曲世界杯<small>&nbsp;{singerData.nameEn}&nbsp;CUP</small>
          </span>
        </div>
        <div className="spacer" />
        {gameStarted && !isChampion && (
          <button className="btn ghost" onClick={handleReset} type="button">
            ↺ 重新开始
          </button>
        )}
      </div>

      {/* 开始界面 */}
      {!gameStarted && (
        <StartScreen
          singer={singerData}
          selectedMode={selectedMode}
          onSelectMode={handleSelectMode}
          onStart={handleStart}
          hasSaved={gameState.hasSaved()}
          hasSavedWC={wcState.hasSavedWC()}
          onResume={handleResume}
          singers={SINGERS}
          currentSinger={currentSinger}
          onSelectSinger={handleSelectSinger}
          selectedSize={selectedSize}
          onSelectSize={handleSelectSize}
          customSelectedIds={customSelectedIds}
          onCustomSelectedChange={setCustomSelectedIds}
          customEntrants={baseSingerData?.entrants}
          classicMaxSize={maxBracket}
        />
      )}

      {/* 进度条 */}
      {progData && (
        <ProgressBar
          roundName={progData.roundName}
          matchIdx={progData.matchIdx}
          matchTotal={progData.matchTotal}
          doneCnt={progData.doneCnt}
          progTotal={progData.progTotal}
        />
      )}

      {/* WC 阶段栏 */}
      {wcBarProps && (
        <WCPhaseBar
          phase={wcBarProps.phase}
          groups={wcBarProps.groups}
          curGroup={wcBarProps.curGroup}
          koMode={wcBarProps.koMode}
          koCurRound={wcBarProps.koCurRound}
          koPhase={wcBarProps.koPhase}
        />
      )}

      {/* 比赛舞台 */}
      {showStage && (
        <section className="stage active">
          {canUndo && (
            <div className="undo-bar">
              <button className="btn undo-btn" onClick={handleUndo} type="button">
                ↶ 回退上一场
              </button>
            </div>
          )}
          <MatchStage
            leftEntrant={leftE}
            rightEntrant={rightE}
            leftState={getCardState(0)}
            rightState={getCardState(1)}
            showSideTag={selectedMode !== 'wc'}
            showPreview={true}
            onPick={handlePick}
            onPreview={handlePreview}
          >
            {/* WC 小组积分榜 */}
            {selectedMode === 'wc' &&
              wcState.wc?.phase === 'group' &&
              wcState.wc.groups[wcState.wc.curGroup] && (
                <GroupStandings
                  group={wcState.wc.groups[wcState.wc.curGroup]}
                  entrants={singerData.entrants}
                  seedRank={singerData.seedRank}
                />
              )}
            {/* WC 淘汰赛对阵总览 */}
            {selectedMode === 'wc' &&
              wcState.wc?.phase === 'knockout' &&
              wcState.wc.ko?.rounds?.length > 0 && <KOBracket ko={wcState.wc.ko} />}
          </MatchStage>
        </section>
      )}

      {/* 冠军界面 */}
      {isChampion && (
        <>
          <ChampionScreen
            champion={selectedMode === 'wc' ? wcState.champion : gameState.champion}
            singerName={singerData.name}
            history={
              selectedMode === 'wc'
                ? (wcState.wc?.history || []).map((h) => ({
                    roundName:
                      h.phase === 'group'
                        ? `${h.group}组`
                        : KO_ROUND_NAMES[h.round] || '',
                    winner: h.winner,
                    loser: h.loser,
                  }))
                : gameState.history
            }
            onAgain={handleAgain}
            confettiRef={confettiRef}
          />
          {/* 冠军晋级之路分享图 */}
          <ChampionShare
            champion={selectedMode === 'wc' ? wcState.champion : gameState.champion}
            history={
              selectedMode === 'wc'
                ? (wcState.wc?.history || []).map((h) => ({
                    roundName:
                      h.phase === 'group'
                        ? `${h.group}组`
                        : KO_ROUND_NAMES[h.round] || '',
                    winner: h.winner,
                    loser: h.loser,
                  }))
                : gameState.history
            }
            rounds={
              selectedMode === 'wc' ? wcState.wc?.ko?.rounds || [] : gameState.rounds
            }
            singerName={singerData.name}
            bracketSize={selectedMode === 'wc' ? WC_KO_TEAMS : gameState.bracketSize}
          />
        </>
      )}

      {/* WC 抽签结果 */}
      {selectedMode === 'wc' && wcState.wc?.phase === 'draw' && (
        <DrawScreen
          show
          groups={wcState.wc.groups}
          entrants={singerData.entrants}
          seedRank={singerData.seedRank}
          onContinue={wcState.proceedFromDraw}
        />
      )}

      {/* WC 外卡复活 */}
      {selectedMode === 'wc' && wcState.wc?.phase === 'wildcard' && (
        <WildcardScreen
          show
          groups={wcState.wc.groups}
          wildcards={wcState.wc.wildcards}
          onContinue={wcState.proceedFromWildcard}
        />
      )}

      {/* WC 小组完赛结果 */}
      {wcState.currentGroupResult && (
        <GroupResultScreen
          show
          group={wcState.currentGroupResult}
          allDone={wcState.currentGroupResult.allDone}
          onContinue={wcState.proceedFromGroupResult}
        />
      )}

      {/* 轮次过渡浮层 */}
      {transitionData && (
        <RoundOverlay
          show
          icon={transitionData.icon}
          title={transitionData.title}
          sub={transitionData.sub}
          onContinue={
            selectedMode === 'wc'
              ? wcState.dismissTransition
              : gameState.dismissTransition
          }
        />
      )}

      {/* 音频播放器 */}
      <AudioPlayer
        visible={audio.visible}
        closePlayer={audio.closePlayer}
        cover={audio.currentSong?.pic || ''}
        title={audio.currentSong?.name || ''}
        artist={audio.artist}
        isLoading={audio.isLoading}
        isPlaying={audio.isPlaying}
        togglePlay={audio.togglePlay}
        progress={audio.progress}
        currentTime={audio.currentTime}
        duration={audio.duration}
        chorusTime={audio.chorusTime}
        chorusPct={chorusPct}
        seekHandler={seekHandler}
        restart={audio.restart}
        fallbackNE={audio.fallbackNE}
        fallbackQQ={audio.fallbackQQ}
        audioRef={audio.audioRef}
      />
    </div>
  );
}

export default App;
