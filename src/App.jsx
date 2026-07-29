// App.jsx — 主应用组件
// 整合 useGameState / useWorldCup / useAudioPlayer 三个 hook，
// 根据当前歌手、模式和游戏阶段渲染对应的界面。

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SINGERS, buildCustomSingerData, buildCrossSingerData, classicOptions, getAlbumGroups } from './data/singers.js';
import { SINGER_REGISTRY } from './data/singerRegistry.js';
import { useSingerData } from './hooks/useSingerData.js';
import { useDynamicSinger } from './hooks/useDynamicSinger.js';
import { useMultiSingerData } from './hooks/useMultiSingerData.js';
import { useCrossSingerSearch } from './hooks/useCrossSingerSearch.js';
import { useGameState } from './hooks/useGameState.js';
import { useWorldCup } from './hooks/useWorldCup.js';
import { useAudioPlayer } from './hooks/useAudioPlayer.js';
import StartScreen from './components/StartScreen.jsx';
import MatchStage from './components/MatchStage.jsx';
import ChampionScreen from './components/ChampionScreen.jsx';
import ChampionShare from './components/ChampionShare.jsx';
import Confetti from './components/Confetti.jsx';
import RoundOverlay from './components/RoundOverlay.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import WCPhaseBar from './components/wc/WCPhaseBar.jsx';
import GroupPickStage from './components/wc/GroupPickStage.jsx';
import DrawScreen from './components/wc/DrawScreen.jsx';
import WildcardScreen from './components/wc/WildcardScreen.jsx';
import PreviewModal from './components/PreviewModal.jsx';
import RankingScreen from './components/RankingScreen.jsx';
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

  // 跨歌手混战状态
  const [crossSelectedSingers, setCrossSelectedSingers] = useState(new Set());
  const [rankingCategory, setRankingCategory] = useState('song');
  const [rankingItems, setRankingItems] = useState([]);

  const { singerData: localData, loading: singerLoading } = useSingerData(currentSinger);

  // 动态歌手：运行时从 QQ Music 搜索并加载任意歌手
  const {
    searchKeyword,
    setSearchKeyword,
    searchResults,
    isSearching,
    dynamicSinger,
    isLoadingSinger,
    loadingProgress,
    loadSinger: loadDynamicSinger,
    dynamicSingerData,
    clearDynamicSinger: clearDynamicSingerRaw,
  } = useDynamicSinger();

  // 跨歌手混战：多选歌手数据加载
  const crossStaticIds = useMemo(
    () => [...(crossSelectedSingers || [])].filter((id) => !id.startsWith('dyn_')),
    [crossSelectedSingers],
  );
  const { dataMap: crossSingerDataMap, loading: crossLoading } = useMultiSingerData(crossStaticIds);

  // 跨歌手混战：搜索额外歌手
  const {
    searchKeyword: crossSearchKeyword,
    setSearchKeyword: setCrossSearchKeyword,
    searchResults: crossSearchResults,
    isSearching: isCrossSearching,
    dynamicSingers: crossDynamicSingers,
    loadingMids: crossLoadingMids,
    addDynamicSinger: crossAddDynamicSinger,
  } = useCrossSingerSearch();

  // 当动态歌手加载完成时，覆盖内置歌手数据
  const baseSingerData = dynamicSingerData || localData || SINGERS[currentSinger];

  // 跨歌手混战：收集所有选中歌手的数据
  const crossSingerDataList = useMemo(() => {
    if (selectedMode !== 'cross-battle' || !crossSelectedSingers?.size) return [];
    const list = [];
    for (const id of crossSelectedSingers) {
      if (id.startsWith('dyn_')) {
        const mid = id.slice(4);
        const dyn = crossDynamicSingers?.get(mid);
        if (dyn?.data) list.push(dyn.data);
      } else {
        const sd = crossSingerDataMap[id];
        if (sd) list.push(sd);
      }
    }
    return list;
  }, [selectedMode, crossSelectedSingers, crossSingerDataMap, crossDynamicSingers]);

  // 跨歌手混战：计算可用规模
  const crossTotalSongs = useMemo(
    () => crossSingerDataList.reduce((sum, sd) => sum + (sd?.entrants?.length || 0), 0),
    [crossSingerDataList],
  );
  const crossAvailableSizes = useMemo(
    () => classicOptions(Math.min(crossTotalSongs, 128)),
    [crossTotalSongs],
  );
  const crossBracketSize = useMemo(() => {
    const sizes = crossAvailableSizes;
    return selectedSize && sizes.includes(selectedSize) ? selectedSize : sizes[0] || 32;
  }, [crossAvailableSizes, selectedSize]);

  // 跨歌手混战：构建合并数据
  const crossSingerData = useMemo(() => {
    if (selectedMode !== 'cross-battle' || crossSingerDataList.length < 2) return null;
    return buildCrossSingerData(crossSingerDataList, crossBracketSize);
  }, [selectedMode, crossSingerDataList, crossBracketSize]);

  // 游戏状态用的歌手标识：动态歌手使用独立 key（避免覆盖内置歌手存档），
  // 切换内置歌手 / 动态歌手时此值变化，触发 useGameState / useWorldCup 重置
  const gameSingerId = dynamicSingerData
    ? `dyn_${dynamicSinger.mid}`
    : currentSinger; // 降级到静态数据
  const isCustom = selectedMode === 'custom';
  const isCrossBattle = selectedMode === 'cross-battle';
  const isRanking = selectedMode === 'ranking';

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
  const singerData = isCrossBattle
    ? (crossSingerData || { name: '跨歌手', nameEn: 'CROSS', bracketSize: 4, entrants: [], seeds: [], seedRank: {} })
    : isCustom && customSingerData ? customSingerData : baseSingerData;
  const effectiveSingerId = isCrossBattle ? 'cross_battle' : isCustom ? 'custom' : gameSingerId;

  // 经典模式可选规模（根据歌手可用歌曲数动态计算）
  const maxBracket = baseSingerData?.bracketSize || 128;
  const availableSizes = classicOptions(maxBracket);
  const classicSize = selectedSize || availableSizes[0] || maxBracket;

  const gameState = useGameState(
    effectiveSingerId,
    singerData,
    isCrossBattle ? crossBracketSize : isCustom ? customBracketSize : classicSize,
  );
  const wcState = useWorldCup(gameSingerId, baseSingerData);
  const audio = useAudioPlayer();

  // ---------- 是否处于冠军界面 ----------
  const isChampion = isRanking
    ? false
    : selectedMode === 'wc' ? wcState.phase === 'champion' : !!gameState.champion;

  // ---------- 获取当前对局 ----------
  const getCurrentMatchPair = useCallback(() => {
    if (selectedMode === 'wc') {
      const wc = wcState.wc;
      if (!wc) return [null, null];
      if (wc.phase === 'group') {
        // 四选二阶段无 1v1 对局
        return [null, null];
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

  // ---------- 选择胜者（仅 KO / 经典模式） ----------
  const handlePick = useCallback(
    (slot) => {
      audio.stopAudition();
      if (selectedMode === 'wc') {
        if (wcState.phase === 'knockout') wcState.koPick(slot);
      } else {
        gameState.pick(slot);
      }
    },
    [selectedMode, wcState, gameState, audio],
  );

  // ---------- 四选二：切换/确认/试听 ----------
  const handleGroupToggle = useCallback(
    (memberIdx) => {
      audio.stopAudition();
      if (selectedMode === 'wc') wcState.wcTogglePick(memberIdx);
    },
    [selectedMode, wcState, audio],
  );

  const handleGroupConfirm = useCallback(() => {
    audio.stopAudition();
    if (selectedMode === 'wc') wcState.wcConfirmPicks();
  }, [selectedMode, wcState, audio]);

  const handleGroupPreview = useCallback(
    (entrant) => {
      if (entrant) audio.openAudition(entrant, baseSingerData.name);
    },
    [audio, baseSingerData],
  );

  // ---------- 外卡自选：切换选中 ----------
  const handleToggleWildcard = useCallback(
    (entrantId) => {
      audio.stopAudition();
      wcState.wcToggleWildcard(entrantId);
    },
    [audio, wcState],
  );

  // ---------- 试听（1v1 对局） ----------
  const handlePreview = useCallback(
    (slot) => {
      const pair = getCurrentMatchPair();
      const ent = slot === 0 ? pair[0] : pair[1];
      if (ent) audio.openAudition(ent, baseSingerData.name);
    },
    [getCurrentMatchPair, audio, baseSingerData],
  );

  // ---------- 试听（自选模式歌曲选择器） ----------
  const handlePickerPreview = useCallback(
    (entrant) => {
      if (entrant) audio.openAudition(entrant, baseSingerData?.name);
    },
    [audio, baseSingerData],
  );

  // ---------- chorusPct（用于 PreviewModal） ----------
  const chorusPct =
    audio.duration > 0 && audio.chorusTime != null
      ? (audio.chorusTime / audio.duration) * 100
      : 0;

  // ---------- 开始 / 继续 / 重置 ----------
  const handleStart = useCallback(() => {
    audio.stopAudition();

    // 夯到拉排名模式：准备排名项目
    if (selectedMode === 'ranking') {
      let items = [];
      if (rankingCategory === 'song') {
        items = (baseSingerData?.entrants || []).map((e) => ({ ...e }));
      } else if (rankingCategory === 'album') {
        const groups = getAlbumGroups(baseSingerData?.entrants || []);
        items = groups.map((g) => ({
          name: g.name,
          pic: g.pic,
          date: g.date,
          songs: g.songs,
        }));
      } else if (rankingCategory === 'singer') {
        items = Object.entries(SINGER_REGISTRY).map(([id, reg]) => ({
          name: reg.name,
          photo: reg.photo,
          singermid: reg.singermid,
        }));
      }
      // 洗牌
      items = items.sort(() => Math.random() - 0.5);
      setRankingItems(items);
      setGameStarted(true);
      return;
    }

    setGameStarted(true);
    if (selectedMode === 'wc') wcState.startWorldCup(false);
    else gameState.startGame(false);
  }, [selectedMode, wcState, gameState, audio, rankingCategory, baseSingerData]);

  const handleResume = useCallback(() => {
    audio.stopAudition();
    setGameStarted(true);
    if (selectedMode === 'wc') wcState.startWorldCup(true);
    else gameState.startGame(true);
  }, [selectedMode, wcState, gameState, audio]);

  const handleAgain = useCallback(() => {
    audio.stopAudition();
    if (selectedMode === 'wc') wcState.resetWC();
    else gameState.resetState();
  }, [selectedMode, wcState, gameState, audio]);

  const handleReset = useCallback(() => {
    audio.stopAudition();
    setGameStarted(false);
    setRankingItems([]);
    if (selectedMode === 'wc') wcState.resetWC();
    else if (selectedMode !== 'ranking') gameState.resetState();
  }, [selectedMode, wcState, gameState, audio]);

  // ---------- 回退上一场 ----------
  const handleUndo = useCallback(() => {
    audio.stopAudition();
    if (selectedMode === 'wc') wcState.undoWC();
    else gameState.undo();
  }, [selectedMode, wcState, gameState, audio]);

  // ---------- 是否可以回退 ----------
  const canUndo = (() => {
    if (!gameStarted || isChampion) return false;
    const isBusy = selectedMode === 'wc' ? wcState.busy : gameState.busy;
    if (isBusy) return false;
    if (selectedMode === 'wc') {
      if (!wcState.wc) return false;
      const overlayShown =
        wcState.showTransition ||
        wcState.wc.phase === 'draw' ||
        wcState.wc.phase === 'wildcard';
      if (overlayShown) return false;
      // 四选二：当前组若已有选中，用户应自行点击卡片取消；
      // 仅当当前组未选且有历史时允许回退到上一组
      if (wcState.wc.phase === 'group') {
        const g = wcState.wc.groups[wcState.wc.curGroup];
        if (g && g.picks.length > 0) return false;
        return wcState.wc.history.length > 0;
      }
      return wcState.wc.history.length > 0;
    }
    if (gameState.showTransition) return false;
    return gameState.history.length > 0;
  })();

  // ---------- 歌手 / 模式切换 ----------
  const handleSelectSinger = useCallback(
    (id) => {
      const wasDynamic = !!dynamicSinger;
      audio.stopAudition();
      // 选择内置歌手时清除动态歌手
      clearDynamicSingerRaw();
      // 已是当前内置歌手且无动态歌手 → 纯 no-op
      if (id === currentSinger && !wasDynamic) return;
      setCurrentSinger(id);
      setSelectedSize(null);
      setGameStarted(false);
      setCustomSelectedIds(new Set());
    },
    [currentSinger, audio, dynamicSinger, clearDynamicSingerRaw],
  );

  // ---------- 加载动态歌手 ----------
  const handleLoadSinger = useCallback(
    (singer) => {
      audio.stopAudition();
      setSelectedSize(null);
      setGameStarted(false);
      setCustomSelectedIds(new Set());
      loadDynamicSinger(singer);
    },
    [audio, loadDynamicSinger],
  );

  // ---------- 清除动态歌手 ----------
  const handleClearDynamicSinger = useCallback(() => {
    audio.stopAudition();
    setSelectedSize(null);
    setGameStarted(false);
    setCustomSelectedIds(new Set());
    clearDynamicSingerRaw();
  }, [audio, clearDynamicSingerRaw]);

  const handleSelectMode = useCallback(
    (mode) => {
      if (mode === selectedMode) return;
      audio.stopAudition();
      setSelectedMode(mode);
      // 切换模式时重置规模和游戏状态
      setSelectedSize(null);
      setGameStarted(false);
      setRankingItems([]);
    },
    [selectedMode, audio],
  );

  // ---------- 跨歌手混战：切换歌手选中 ----------
  const handleCrossToggleSinger = useCallback((id) => {
    setCrossSelectedSingers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectedSize(null);
  }, []);

  // ---------- 跨歌手混战：添加动态歌手 ----------
  const handleCrossAddDynamicSinger = useCallback(
    (singer) => {
      crossAddDynamicSinger(singer);
    },
    [crossAddDynamicSinger],
  );

  const handleSelectSize = useCallback((size) => {
    audio.stopAudition();
    setSelectedSize(size);
  }, [audio]);

  // ---------- 进度条 seek ----------
  const seekHandler = useCallback(
    (e) => {
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const clientX = e.touches?.[0]?.clientX ?? e.clientX;
      const pct = (clientX - rect.left) / rect.width;
      audio.seek(pct);
    },
    [audio],
  );

  // ---------- 键盘 ----------
  useEffect(() => {
    const handler = (e) => {
      // Escape 停止试听
      if (e.key === 'Escape' && audio.playingId != null) {
        audio.stopAudition();
        return;
      }

      // Enter 处理各类浮层 + 四选二确认
      if (e.key === 'Enter') {
        if (selectedMode === 'wc') {
          if (wcState.wc?.phase === 'draw') {
            wcState.proceedFromDraw();
            return;
          }
          if (wcState.wc?.phase === 'wildcard') {
            wcState.proceedFromWildcard();
            return;
          }
          // 四选二已改为选满 2 首自动晋级，无需 Enter 确认
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
            wcState.wc?.phase === 'draw' ||
            wcState.wc?.phase === 'wildcard'
          : gameState.showTransition;
      if (isBusy || overlayShown || isChampion || !gameStarted) return;

      // 四选二阶段：1/2/3/4 切换选中
      if (selectedMode === 'wc' && wcState.phase === 'group') {
        const g = wcState.wc?.groups?.[wcState.wc.curGroup];
        if (!g) return;
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 4) {
          e.preventDefault();
          audio.stopAudition();
          wcState.wcTogglePick(num - 1);
        }
        return;
      }

      // 判断是否在可选择的阶段
      const canPick =
        selectedMode === 'wc'
          ? wcState.phase === 'knockout'
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
          roundName: `${g?.name || ''}组 · 四选二`,
          matchIdx: (wc.curGroup || 0) + 1,
          matchTotal: 12,
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
    if (selectedMode === 'wc' && wcState.showTransition) {
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
    !isRanking &&
    (selectedMode === 'wc'
      ? wcState.phase === 'group' || wcState.phase === 'knockout'
      : true);

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
        {gameStarted && !isChampion && !isRanking && (
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
          currentSinger={dynamicSinger ? null : currentSinger}
          onSelectSinger={handleSelectSinger}
          selectedSize={selectedSize}
          onSelectSize={handleSelectSize}
          customSelectedIds={customSelectedIds}
          onCustomSelectedChange={setCustomSelectedIds}
          customEntrants={baseSingerData?.entrants}
          classicMaxSize={maxBracket}
          singerLoading={singerLoading && !dynamicSinger}
          onPreview={handlePickerPreview}
          playingId={audio.playingId}
          previewLoading={audio.isLoading}
          isPlaying={audio.isPlaying}
          searchKeyword={searchKeyword}
          onSearch={setSearchKeyword}
          searchResults={searchResults}
          isSearching={isSearching}
          dynamicSinger={dynamicSinger}
          isLoadingSinger={isLoadingSinger}
          loadingProgress={loadingProgress}
          onLoadSinger={handleLoadSinger}
          onClearDynamicSinger={handleClearDynamicSinger}
          // 跨歌手混战 props
          crossSelectedSingers={crossSelectedSingers}
          onCrossToggleSinger={handleCrossToggleSinger}
          crossSingerDataMap={crossSingerDataMap}
          crossLoading={crossLoading}
          crossAvailableSizes={crossAvailableSizes}
          onCrossSearch={setCrossSearchKeyword}
          crossSearchKeyword={crossSearchKeyword}
          crossSearchResults={crossSearchResults}
          isCrossSearching={isCrossSearching}
          onAddDynamicSinger={handleCrossAddDynamicSinger}
          crossDynamicSingers={crossDynamicSingers}
          crossLoadingMids={crossLoadingMids}
          // 夯到拉排名 props
          rankingCategory={rankingCategory}
          onRankingCategoryChange={setRankingCategory}
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
          {/* WC 四选二小组赛舞台 */}
          {selectedMode === 'wc' && wcState.wc?.phase === 'group' && (
            <GroupPickStage
              group={wcState.wc.groups[wcState.wc.curGroup]}
              entrants={singerData.entrants}
              onToggle={handleGroupToggle}
              onConfirm={handleGroupConfirm}
              onPreview={handleGroupPreview}
            />
          )}
          {/* 1v1 对局（经典模式 / WC 淘汰赛） */}
          {(selectedMode !== 'wc' || wcState.wc?.phase === 'knockout') && (
            <MatchStage
              leftEntrant={leftE}
              rightEntrant={rightE}
              leftState={getCardState(0)}
              rightState={getCardState(1)}
              showSideTag={selectedMode !== 'wc'}
              onPick={handlePick}
              onPreview={handlePreview}
            />
          )}
        </section>
      )}

      {/* 夯到拉排名模式 */}
      {gameStarted && isRanking && rankingItems.length > 0 && (
        <RankingScreen
          items={rankingItems}
          category={rankingCategory}
          singerName={baseSingerData?.name || ''}
          onReset={handleReset}
        />
      )}

      {/* 冠军界面 */}
      {isChampion && (
        <>
          <Confetti active canvasRef={confettiRef} />
          <ChampionScreen
            champion={selectedMode === 'wc' ? wcState.champion : gameState.champion}
            singerName={singerData.name}
            history={
              selectedMode === 'wc'
                ? (wcState.wc?.history || []).map((h) => {
                    if (h.phase === 'group') {
                      // 四选二：让冠军所在小组的条目以冠军为 winner
                      const champId = wcState.champion?.id;
                      const pair = h.picks || [h.winner, h.loser];
                      const champInGroup =
                        pair.find((e) => e?.id === champId) || null;
                      return {
                        roundName: `${h.group}组`,
                        winner: champInGroup || h.winner,
                        loser: champInGroup
                          ? pair.find((e) => e?.id !== champId) || h.loser
                          : h.loser,
                      };
                    }
                    return {
                      roundName: KO_ROUND_NAMES[h.round] || '',
                      winner: h.winner,
                      loser: h.loser,
                    };
                  })
                : gameState.history
            }
            onAgain={handleAgain}
          />
          {/* 冠军晋级之路分享图 */}
          <ChampionShare
            champion={selectedMode === 'wc' ? wcState.champion : gameState.champion}
            history={
              selectedMode === 'wc'
                ? (wcState.wc?.history || []).map((h) => {
                    if (h.phase === 'group') {
                      const champId = wcState.champion?.id;
                      const pair = h.picks || [h.winner, h.loser];
                      const champInGroup =
                        pair.find((e) => e?.id === champId) || null;
                      return {
                        roundName: `${h.group}组`,
                        winner: champInGroup || h.winner,
                        loser: champInGroup
                          ? pair.find((e) => e?.id !== champId) || h.loser
                          : h.loser,
                      };
                    }
                    return {
                      roundName: KO_ROUND_NAMES[h.round] || '',
                      winner: h.winner,
                      loser: h.loser,
                    };
                  })
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
          wildcardPool={wcState.wc.wildcardPool || []}
          wildcardPicks={wcState.wc.wildcardPicks || []}
          onToggle={handleToggleWildcard}
          onConfirm={wcState.proceedFromWildcard}
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

      {/* 试听弹窗 */}
      {audio.playingId != null && (
        <PreviewModal
          song={audio.currentSong}
          artist={audio.artist}
          isPlaying={audio.isPlaying}
          isLoading={audio.isLoading}
          progress={audio.progress}
          currentTime={audio.currentTime}
          duration={audio.duration}
          chorusTime={audio.chorusTime}
          chorusPct={chorusPct}
          onTogglePlay={() => audio.togglePlay()}
          onSeek={seekHandler}
          onClose={() => audio.stopAudition()}
        />
      )}

      {/* 音频元素（常驻 DOM，供 useAudioPlayer 绑定事件） */}
      <audio ref={audio.audioRef} preload="metadata" />
    </div>
  );
}

export default App;
