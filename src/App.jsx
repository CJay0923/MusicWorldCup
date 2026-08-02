// App.jsx — 主应用组件
// 整合 useGameState / useWorldCup / useAudioPlayer 三个 hook，
// 根据当前歌手、模式和游戏阶段渲染对应的界面。

import React, { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  SINGERS,
  buildCustomSingerData,
  buildCrossSingerData,
  buildCrossSingerAlbumData,
  buildCrossSingerSingerData,
  classicOptions,
  getAlbumGroups,
} from './data/singers.js';
import { SINGER_REGISTRY } from './data/singerRegistry.js';
import { useSingerData } from './hooks/useSingerData.js';
import { useDynamicSinger } from './hooks/useDynamicSinger.js';
import { useMultiSingerData } from './hooks/useMultiSingerData.js';
import { useCrossSingerSearch } from './hooks/useCrossSingerSearch.js';
import { useGameState } from './hooks/useGameState.js';
import { useWorldCup } from './hooks/useWorldCup.js';
import { useAudioPlayer } from './hooks/useAudioPlayer.js';
import { useKeyboardControls } from './hooks/useKeyboardControls.js';
import { MIN_FAV_WITH_COVER } from './utils/filters.js';
import StartScreen from './components/StartScreen.jsx';
import MatchStage from './components/MatchStage.jsx';
import ChampionScreen from './components/ChampionScreen.jsx';
const ChampionShare = lazy(() => import('./components/ChampionShare.jsx'));
const Confetti = lazy(() => import('./components/Confetti.jsx'));
import RoundOverlay from './components/RoundOverlay.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import WCPhaseBar from './components/wc/WCPhaseBar.jsx';
import GroupPickStage from './components/wc/GroupPickStage.jsx';
import DrawScreen from './components/wc/DrawScreen.jsx';
import WildcardScreen from './components/wc/WildcardScreen.jsx';
import PreviewModal from './components/PreviewModal.jsx';
const RankingScreen = lazy(() => import('./components/RankingScreen.jsx'));
import LoadingOverlay from './components/LoadingOverlay.jsx';
import { WC_TOTAL_MATCHES, WC_KO_TEAMS } from './data/singers.js';

const KO_ROUND_NAMES = ['32强', '16强', '8强', '4强', '决赛'];
const KO_ROUND_ICONS = ['🔥', '⚡', '💪', '💪', '🏆'];

function App() {
  const [currentSinger, setCurrentSinger] = useState('jay');
  const [selectedMode, setSelectedMode] = useState('classic');
  const [selectedSize, setSelectedSize] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [customSelectedIds, setCustomSelectedIds] = useState(new Set());
  const confettiRef = useRef(null);

  // 跨歌手混战状态
  const [crossSelectedSingers, setCrossSelectedSingers] = useState(new Set());
  const [crossBattleType, setCrossBattleType] = useState('songs'); // 'songs' | 'albums' | 'singers'
  const [rankingCategory, setRankingCategory] = useState('song');
  const [rankingItems, setRankingItems] = useState([]);
  // 夯到拉排名子模式
  const [rankingScope, setRankingScope] = useState('single'); // 'single' | 'cross'
  const [rankingSubMode, setRankingSubMode] = useState('all-songs'); // single: all-songs/album-songs/top-x/all-albums; cross: songs/albums/singers
  const [rankingAlbumMid, setRankingAlbumMid] = useState('');
  const [rankingTopX, setRankingTopX] = useState(16);

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
  const { dataMap: crossSingerDataMap, loading: crossLoading } =
    useMultiSingerData(crossStaticIds);

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

  // 跨歌手混战/排名：收集所有选中歌手的数据
  const crossSingerDataList = useMemo(() => {
    if (
      (selectedMode !== 'cross-battle' &&
        !(selectedMode === 'ranking' && rankingScope === 'cross')) ||
      !crossSelectedSingers?.size
    )
      return [];
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
  }, [
    selectedMode,
    rankingScope,
    crossSelectedSingers,
    crossSingerDataMap,
    crossDynamicSingers,
  ]);

  // 夯到拉排名模式：判断是否可开始
  const rankingCanStart = (() => {
    if (selectedMode !== 'ranking') return false;
    if (rankingScope === 'cross') {
      return crossSingerDataList.length >= 2;
    }
    // single
    if (!baseSingerData?.entrants?.length) return false;
    if (rankingSubMode === 'album-songs') {
      // 需要选择专辑（或有专辑数据）
      return baseSingerData.entrants.some((e) => e.albumMid || e.albumName);
    }
    return true;
  })();
  // 跨歌手混战：根据对决类型计算可用规模
  const crossTotalItems = useMemo(() => {
    if (crossBattleType === 'singers') {
      return crossSingerDataList.length;
    }
    if (crossBattleType === 'albums') {
      return crossSingerDataList.reduce((sum, sd) => {
        const groups = getAlbumGroups(sd?.entrants || []);
        return sum + groups.filter((g) => !g.isMisc).length;
      }, 0);
    }
    return crossSingerDataList.reduce((sum, sd) => sum + (sd?.entrants?.length || 0), 0);
  }, [crossSingerDataList, crossBattleType]);
  const crossAvailableSizes = useMemo(
    () => classicOptions(Math.min(crossTotalItems, 128)),
    [crossTotalItems],
  );
const crossBracketSize = useMemo(() => {
  const sizes = crossAvailableSizes;
  // 歌手比较模式：优先选 16 位（如果可用）
  if (crossBattleType === 'singers' && sizes.includes(16)) {
    return selectedSize && sizes.includes(selectedSize) ? selectedSize : 16;
  }
  return selectedSize && sizes.includes(selectedSize) ? selectedSize : sizes[0] || 32;
}, [crossAvailableSizes, selectedSize, crossBattleType]);

  // 跨歌手混战：构建合并数据（根据对决类型选择构建函数）
  const crossSingerData = useMemo(() => {
    if (selectedMode !== 'cross-battle' || crossSingerDataList.length < 2) return null;
    if (crossBattleType === 'albums') {
      return buildCrossSingerAlbumData(crossSingerDataList, crossBracketSize);
    }
    if (crossBattleType === 'singers') {
      return buildCrossSingerSingerData(crossSingerDataList);
    }
    return buildCrossSingerData(crossSingerDataList, crossBracketSize);
  }, [selectedMode, crossSingerDataList, crossBracketSize, crossBattleType]);

  // 游戏状态用的歌手标识：动态歌手使用独立 key（避免覆盖内置歌手存档），
  // 切换内置歌手 / 动态歌手时此值变化，触发 useGameState / useWorldCup 重置
  const gameSingerId = dynamicSingerData ? `dyn_${dynamicSinger.mid}` : currentSinger; // 降级到静态数据
  const isCustom = selectedMode === 'custom';
  const isCrossBattle = selectedMode === 'cross-battle';
  const isRanking = selectedMode === 'ranking';

// 自选模式：从选中的 entrant 构建数据（应用过滤：无封面 + 低收藏量）
const customEntrants = useMemo(() => {
  if (!isCustom || !baseSingerData) return [];
  return baseSingerData.entrants.filter((e) => {
    if (!customSelectedIds.has(e.id)) return false;
    // 强制过滤无封面歌曲
    const hasCover = !!(e.albumMid || e.pic);
    if (!hasCover) return false;
    // 过滤低收藏量歌曲
    const fav = e.favCount || 0;
    if (fav < MIN_FAV_WITH_COVER) return false;
    return true;
  });
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
    ? crossSingerData || {
        name: '跨歌手',
        nameEn: 'CROSS',
        bracketSize: 4,
        entrants: [],
        seeds: [],
        seedRank: {},
      }
    : isCustom && customSingerData
      ? customSingerData
      : baseSingerData;
  const effectiveSingerId = isCrossBattle
    ? 'cross_battle'
    : isCustom
      ? 'custom'
      : gameSingerId;

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
    : selectedMode === 'wc'
      ? wcState.phase === 'champion'
      : !!gameState.champion;

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
    if (ent) {
      // 跨歌手模式使用歌曲所属的歌手名称，否则使用当前歌手
      const artistName = ent.__singerName || ent.singerName || baseSingerData?.name || '未知歌手';
      audio.openAudition(ent, artistName);
    }
  },
  [getCurrentMatchPair, audio, baseSingerData],
);

// ---------- 试听（自选模式歌曲选择器） ----------
const handlePickerPreview = useCallback(
  (entrant) => {
    if (entrant) {
      const artistName = entrant.__singerName || entrant.singerName || baseSingerData?.name || '未知歌手';
      audio.openAudition(entrant, artistName);
    }
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

      if (rankingScope === 'cross') {
        // ---- 多歌手排名 ----
        const singerDataList = crossSingerDataList;
        if (rankingSubMode === 'songs') {
          // 歌手间歌曲排序：合并所有歌手的歌曲
          items = [];
          for (const sd of singerDataList) {
            for (const e of sd?.entrants || []) {
              items.push({ ...e, singerName: sd.name, singerPhoto: sd.singerPhoto });
            }
          }
        } else if (rankingSubMode === 'albums') {
          // 歌手间专辑排序：合并所有歌手的专辑
          items = [];
          for (const sd of singerDataList) {
            const groups = getAlbumGroups(sd?.entrants || []);
            for (const g of groups) {
              if (g.isMisc) continue; // 跳过未分类
              const albumMid = g.albumMid || '';
              items.push({
                type: 'album',
                name: g.name,
                pic:
                  g.pic ||
                  (albumMid
                    ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg`
                    : ''),
                picLocal: albumMid ? `./covers/album_${albumMid}.jpg` : '',
                albumMid,
                date: g.date,
                songCount: g.songs.length,
                songs: g.songs,
                singerName: sd.name,
                singerPhoto: sd.singerPhoto || '',
              });
            }
          }
        } else if (rankingSubMode === 'singers') {
          // 歌手本身排序
          items = singerDataList.map((sd) => ({
            name: sd.name,
            photo: sd.singerPhoto || '',
            singermid: sd.singermid || '',
          }));
        }
      } else {
        // ---- 单歌手排名 ----
        const entrants = baseSingerData?.entrants || [];
        if (rankingSubMode === 'all-songs') {
          items = entrants.map((e) => ({ ...e }));
        } else if (rankingSubMode === 'album-songs') {
          // 某张专辑内的歌曲排序
          const filtered = rankingAlbumMid
            ? entrants.filter((e) => e.albumMid === rankingAlbumMid)
            : entrants.filter((e) => e.albumName);
          items = filtered.map((e) => ({ ...e }));
        } else if (rankingSubMode === 'top-x') {
          // 收藏量前 X 首
          const sorted = [...entrants].sort(
            (a, b) => (b.favCount || 0) - (a.favCount || 0),
          );
          items = sorted.slice(0, rankingTopX).map((e) => ({ ...e }));
        } else if (rankingSubMode === 'all-albums') {
          // 所有专辑排序
          const groups = getAlbumGroups(entrants);
          items = groups
            .filter((g) => !g.isMisc)
            .map((g) => ({
              type: 'album',
              name: g.name,
              pic:
                g.pic ||
                (g.albumMid
                  ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${g.albumMid}.jpg`
                  : ''),
              picLocal: g.albumMid ? `./covers/album_${g.albumMid}.jpg` : '',
              albumMid: g.albumMid || '',
              date: g.date,
              songCount: g.songs.length,
              songs: g.songs,
            }));
        }
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
  }, [
    selectedMode,
    wcState,
    gameState,
    audio,
    rankingScope,
    rankingSubMode,
    rankingAlbumMid,
    rankingTopX,
    baseSingerData,
    crossSingerDataList,
  ]);

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

  const handleSelectSize = useCallback(
    (size) => {
      audio.stopAudition();
      setSelectedSize(size);
    },
    [audio],
  );

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
  useKeyboardControls({
    audio,
    selectedMode,
    wcState,
    gameState,
    isChampion,
    gameStarted,
    handlePick,
    handleGroupToggle,
  });

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
    <div className="mx-auto max-w-[1080px] px-5 pb-20 pt-7">
      {/* Loading Overlay */}
      <LoadingOverlay
        visible={!!(singerLoading || crossLoading || isLoadingSinger)}
        text={
          isLoadingSinger
            ? loadingProgress || '正在加载歌曲数据…'
            : crossLoading
              ? '正在加载多歌手数据…'
              : '正在加载歌曲数据…'
        }
      />
      {/* 顶栏 */}
      <div className="mb-[18px] flex flex-wrap items-center gap-3.5">
        <div className="flex items-center gap-2.5 font-display font-extrabold tracking-wide">
          <span className="text-[22px]">🏆</span>
          <span>
            {singerData.name}歌曲世界杯
            <small className="text-xs font-semibold tracking-wider text-muted">
              &nbsp;{singerData.nameEn}&nbsp;CUP
            </small>
          </span>
        </div>
        <div className="flex-1" />
        {gameStarted && !isChampion && !isRanking && (
          <button
            className="inline-flex cursor-pointer items-center gap-[7px] rounded-full border border-white/10 bg-transparent px-4 py-[9px] text-[13px] font-semibold text-ink transition-all duration-200 hover:border-white/25 hover:bg-white/10 active:scale-[0.96]"
            onClick={handleReset}
            type="button"
          >
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
          customEntrants={baseSingerData?.entrants?.filter((e) => {
  // 强制过滤无封面歌曲
  const hasCover = !!(e.albumMid || e.pic);
  if (!hasCover) return false;
  // 过滤低收藏量歌曲
  const fav = e.favCount || 0;
  if (fav < MIN_FAV_WITH_COVER) return false;
  return true;
})}
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
          crossBattleType={crossBattleType}
          onCrossBattleTypeChange={setCrossBattleType}
          crossTotalItems={crossTotalItems}
          // 夯到拉排名 props
          rankingCategory={rankingCategory}
          onRankingCategoryChange={setRankingCategory}
          rankingScope={rankingScope}
          onRankingScopeChange={setRankingScope}
          rankingSubMode={rankingSubMode}
          onRankingSubModeChange={setRankingSubMode}
          rankingAlbumMid={rankingAlbumMid}
          onRankingAlbumMidChange={setRankingAlbumMid}
          rankingTopX={rankingTopX}
          onRankingTopXChange={setRankingTopX}
          rankingCanStart={rankingCanStart}
          baseSingerData={baseSingerData}
          crossSingerDataList={crossSingerDataList}
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
        <section className="mt-1.5">
          {canUndo && (
            <div className="mb-2.5 flex justify-center">
              <button
                className="inline-flex cursor-pointer items-center gap-[7px] rounded-full border border-white/15 bg-white/6 px-[18px] py-[7px] text-[13px] font-semibold text-muted transition-all duration-200 hover:border-accent2/40 hover:bg-accent2/15 hover:text-[#ff8aaa] active:scale-[0.96]"
                onClick={handleUndo}
                type="button"
              >
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
        <Suspense fallback={null}>
        <RankingScreen
          items={rankingItems}
          category={
            rankingSubMode === 'all-albums' || rankingSubMode === 'albums'
              ? 'album'
              : rankingSubMode === 'singers'
                ? 'singer'
                : 'song'
          }
          singerName={rankingScope === 'cross' ? '多歌手' : baseSingerData?.name || ''}
          onReset={handleReset}
        />
        </Suspense>
      )}

      {/* 冠军界面 */}
      {isChampion && (
        <>
          <Suspense fallback={null}>
            <Confetti active canvasRef={confettiRef} />
          </Suspense>
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
                      const champInGroup = pair.find((e) => e?.id === champId) || null;
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
          <Suspense fallback={null}>
          <ChampionShare
            champion={selectedMode === 'wc' ? wcState.champion : gameState.champion}
            history={
              selectedMode === 'wc'
                ? (wcState.wc?.history || []).map((h) => {
                    if (h.phase === 'group') {
                      const champId = wcState.champion?.id;
                      const pair = h.picks || [h.winner, h.loser];
                      const champInGroup = pair.find((e) => e?.id === champId) || null;
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
          </Suspense>
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
