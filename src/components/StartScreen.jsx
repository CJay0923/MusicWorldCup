import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import BrandMark from './BrandMark.jsx';
import CoverWallSelector from './CoverWallSelector.jsx';
import ModeSelector from './ModeSelector.jsx';
import SongPicker from './SongPicker.jsx';
import CrossSingerSelector from './CrossSingerSelector.jsx';
import PillButton from './ui/PillButton.jsx';
import { coverUrl, jsDelivrCoverUrl, qqCoverUrl } from '../lib/assets';
import { classicOptions, WC_SONG_MODES } from '../data/singers.js';
import AchievementWall from './AchievementWall.jsx';

// 频谱刊头装饰条
const SPECTRUM = [
  { h: 12 }, { h: 26, on: true }, { h: 18 }, { h: 34 }, { h: 22 }, { h: 40, on: true },
  { h: 16 }, { h: 28 }, { h: 12 }, { h: 30 }, { h: 20 }, { h: 36, on: true }, { h: 14 },
  { h: 24 }, { h: 10 }, { h: 32 }, { h: 18 }, { h: 38, on: true }, { h: 22 }, { h: 16 },
  { h: 28 }, { h: 12 }, { h: 34 }, { h: 20 }, { h: 26, on: true }, { h: 14 },
];
function SpectrumBar() {
  return (
    <div className="spectrum mt-3" aria-hidden="true">
      {SPECTRUM.map((b, i) => (
        <span
          key={i}
          className={b.on ? 'on' : ''}
          style={{ height: `${b.h}px`, animationDelay: `${(i % 6) * 0.11}s` }}
        />
      ))}
    </div>
  );
}

/**
 * Start / hero screen.
 * @param {object} singer - current singer object {name, nameEn, bracketSize}
 * @param {'classic'|'wc'|'custom'} selectedMode - currently selected mode
 * @param {(mode: 'classic'|'wc'|'custom') => void} onSelectMode - mode selection callback
 * @param {() => void} onStart - called when the start button is clicked
 * @param {boolean} hasSaved - whether there is a saved classic game
 * @param {boolean} hasSavedWC - whether there is a saved WC game
 * @param {() => void} onResume - called when the resume button is clicked
 * @param {'hot'|'all'} [wcSongMode] - 世界杯选曲玩法
 * @param {(mode: 'hot'|'all') => void} [onWcSongModeChange] - 切换选曲玩法
 * @param {boolean} [wcCanStart] - 世界杯是否可开始（歌曲数是否充足）
 * @param {object} singers - SINGERS object
 * @param {string} currentSinger - current singer id
 * @param {(id: string) => void} onSelectSinger - singer selection callback
 * @param {number} selectedSize - selected classic bracket size
 * @param {(size: number) => void} onSelectSize - bracket size selection callback
 * @param {Set<number>} customSelectedIds - selected entrant ids for custom mode
 * @param {(ids: Set<number>) => void} onCustomSelectedChange - callback when selection changes
 * @param {object[]} customEntrants - full entrants array of the base singer
 * @param {number} classicMaxSize - max bracket size for classic mode
 * @param {boolean} [singerLoading] - 内置歌手数据加载中
 * @param {(entrant: object) => void} onPreview - 试听回调（自选模式歌曲选择器用）
 * @param {number|null} playingId - 当前正在播放的 entrant.id
 * @param {boolean} previewLoading - 试听加载中
 * @param {boolean} isPlaying - 是否正在播放
 * @param {string} [searchKeyword] - 动态歌手搜索关键词
 * @param {(v: string) => void} [onSearch] - 搜索输入回调
 * @param {Array} [searchResults] - 歌手搜索结果
 * @param {boolean} [isSearching] - 搜索中
 * @param {object|null} [dynamicSinger] - 已加载的动态歌手
 * @param {boolean} [isLoadingSinger] - 动态歌手歌曲加载中
 * @param {string} [loadingProgress] - 加载进度文本
 * @param {(singer: object) => void} [onLoadSinger] - 加载动态歌手
 * @param {() => void} [onClearDynamicSinger] - 清除动态歌手
 */
export default function StartScreen({
  singer,
  selectedMode,
  onSelectMode,
  onStart,
  hasSaved,
  hasSavedWC,
  onResume,
  wcSongMode,
  onWcSongModeChange,
  wcCanStart,
  singers,
  currentSinger,
  onSelectSinger,
  selectedSize,
  onSelectSize,
  customSelectedIds,
  onCustomSelectedChange,
  customEntrants,
  classicMaxSize,
  singerLoading,
  onPreview,
  playingId,
  previewLoading,
  isPlaying,
  searchKeyword,
  onSearch,
  searchResults,
  isSearching,
  dynamicSinger,
  isLoadingSinger,
  loadingProgress,
  onLoadSinger,
  onClearDynamicSinger,
  // 跨歌手混战 props
  crossSelectedSingers,
  onCrossToggleSinger,
  crossSingerDataMap,
  crossLoading,
  crossAvailableSizes,
  onCrossSearch,
  crossSearchKeyword,
  crossSearchResults,
  isCrossSearching,
  onAddDynamicSinger,
  crossDynamicSingers,
  crossLoadingMids,
  crossBattleType,
  onCrossBattleTypeChange,
  crossTotalItems,
  // 夯到拉排名 props
  rankingCategory,
  onRankingCategoryChange,
  rankingScope,
  onRankingScopeChange,
  rankingSubMode,
  onRankingSubModeChange,
  rankingAlbumMid,
  onRankingAlbumMidChange,
  rankingTopX,
  onRankingTopXChange,
  rankingCanStart,
  baseSingerData,
  crossSingerDataList,
  achievements,
}) {
  const isClassic = selectedMode === 'classic';
  const isCustom = selectedMode === 'custom';
  const isCrossBattle = selectedMode === 'cross-battle';
  const isRanking = selectedMode === 'ranking';

  // 赛制说明折叠状态（默认折叠，减少首屏信息过载）
  const [rulesCollapsed, setRulesCollapsed] = useState({
    classic: true,
    wc: true,
    custom: true,
    cross: true,
    ranking: true,
  });
  // 主题状态（用于按钮图标切换）
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark',
  );
  const toggleRules = (key) =>
    setRulesCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // 首页落地页状态：初始仅展示大图标 + 开始游戏按钮，点击后再进入玩法选择
  const [showLanding, setShowLanding] = useState(true);
  // 落地页退出动效状态（必须放在顶层，不能在任何条件分支里调用 hook）
  const [isExiting, setIsExiting] = useState(false);
  // 全量专辑 mid 池（从 public/covers/manifest.json 拉取，覆盖 2758 张；未加载前用回退池）
  const [albumMids, setAlbumMids] = useState(null);
  useEffect(() => {
    if (!showLanding) return; // 仅落地页需要
    let alive = true;
    fetch('/covers/manifest.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => { if (alive && Array.isArray(list) && list.length) setAlbumMids(list); })
      .catch(() => {});
    return () => { alive = false; };
  }, [showLanding]);

  // 落地页期间锁定 body 滚动
  useEffect(() => {
    if (showLanding) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showLanding]);

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  const maxBracket = isClassic
    ? singer?.bracketSize || 128
    : classicMaxSize || singer?.bracketSize || 128;
  const availableSizes = classicOptions(maxBracket);
  const bracketSize =
    selectedSize && availableSizes.includes(selectedSize)
      ? selectedSize
      : availableSizes[0] || maxBracket;

  // 自选模式：先选规模，再选歌
  const maxCustomBracket = classicMaxSize || singer?.bracketSize || 128;
  const customAllSizes = classicOptions(maxCustomBracket);
  const customBracketSize =
    selectedSize && customAllSizes.includes(selectedSize)
      ? selectedSize
      : customAllSizes[0] || 4;
  const customValidCount = customSelectedIds?.size || 0;
  const canStartCustom = customValidCount >= 4 && customValidCount >= customBracketSize;

  // Cross-battle: calculate if enough singers selected
  const crossSingerCount = crossSelectedSingers?.size || 0;
  const canStartCross = crossSingerCount >= 2;

  // Ranking: always can start if singer data is available
  const canStartRanking = !!singer?.entrants?.length || !!singer;

  // Decide whether to show the resume button and its label
  const showResume =
    isClassic || isCustom ? hasSaved || hasSavedWC : hasSavedWC || hasSaved;
  const resumeLabel = (() => {
    if (isClassic || isCustom) {
      if (hasSaved) return '继续上次';
      if (hasSavedWC) return '继续世界杯';
    } else {
      if (hasSavedWC) return '继续世界杯';
      if (hasSaved) return '继续上次';
    }
    return '继续';
  })();

  // ===== 落地页：全屏霓虹背景 + 音乐动效 =====
  if (showLanding) {
    // 专辑封面池：优先用清单里的全量 2758 张，未加载完成前用回退池保证首屏有内容
    const ALBUM_FALLBACK = [
      'album_0000aqnu1W874v','album_0000EqNa22DpVs','album_0000O94D3xUAE2',
      'album_0000S4Lo0ih1Gm','album_0000yBcT1Mpj2J','album_00015ND91csPsf',
      'album_0001RB271K1UCi','album_0001XCTy3CTFfR','album_00022oZb0ovDXS',
      'album_00025sx40C850F','album_00035nmy1BI6uT','album_00037Iug3erUp7',
      'album_0003eYeK30Jk9c','album_0003MBdm1CtWw','album_0003o6Xf2dOJHE',
      'album_0003q5rY2DB0xE','album_0003qXrA4LBiF','album_0003SeEI1raoZd',
      'album_005hYMTn2bNxwN','album_006NQxTm8aEoLp','album_007QwZt4cRsM8',
      'album_008kRPa5dTwuN','album_009mVSa6eUxvO','album_00AnBP7fVywP',
      'album_00BpCX8gWzxQ','album_00CqDY9hXayR','album_00DrEZ10iYbzS',
      'album_00FdBa11hRy1W','album_00GhCf22iSz2X','album_00HiDe33jTa3Y',
      'album_00JkEf44kUb4Z','album_00LmFg55lVc5A','album_00NoGh66mWd6B',
      'album_00PpHi77nXe7C','album_00QqIj88oYf8D','album_00RrJk99pZg9E',
      'album_00SsKl00qAh0F','album_00TtLm11rBi1G','album_00UuMn22sCj2H',
      'album_00VvNo33tDk3I','album_00WwOp44uEl4J','album_00XxPq55vFm5K',
      'album_00YyQr66wGn6L','album_00ZzSs77xHo7M','album_00AaTt88yIp8N',
      'album_00BbUu99zJq9O','album_00CcVv00aKr0P','album_00DdWw11bLs1Q',
    ];
    const ALBUM_POOL = albumMids && albumMids.length ? albumMids : ALBUM_FALLBACK;
    const SINGER_POOL = [
      'singer_000aHmbL2aPXWH','singer_000GGDys0yA0Nk','singer_000Sp0Bz4JXH0o',
      'singer_000ZVS6E1f6f0d','singer_001BLpXF2DyJe2','singer_001fNHEf1SFEFN',
      'singer_001JDzPT3JdvqK','singer_001pWERg3vFgg8','singer_0025NhlN2yWrP4',
      'singer_0027pdHE4STooO','singer_003FQMh5uXisQ','singer_003tKRj6vYjtR',
      'singer_004WSn7wAkzuS','singer_004oLT8xBavtT','singer_005pMU9yClwuU',
      'singer_006RV10zDmvV','singer_006gSW11eNywW','singer_007hTX12fOzxX',
      'singer_008uYI13pAayY','singer_009zJZ14qBzzZ',
    ];
    // 合并池子
    const MIXED_POOL = [
      ...ALBUM_POOL.map(id => ({ id, dir: 'covers', ext: 'jpg' })),
      ...SINGER_POOL.map(id => ({ id, dir: 'singers', ext: 'jpg' })),
    ];
    // 随机取 10 个（克制数量，原地安静闪烁不漂移）
    const picked = [...MIXED_POOL].sort(() => Math.random() - 0.5).slice(0, 10);
    const sparkles = Array.from({ length: 10 }, (_, i) => {
      const item = picked[i % picked.length];
      const isSinger = item.dir === 'singers';
      const sizeBase = 24 + Math.random() * 48; // 24~72px
      return {
        i,
        src: `/${item.dir}/${item.id}.${item.ext}`,
        left: `${3 + Math.random() * 94}%`,
        top: `${3 + Math.random() * 94}%`,
        size: sizeBase,
        dur: 4 + Math.random() * 6,       // 4~10s 一周期，慢节奏
        delay: Math.random() * 4,           // 正延迟错开入场，不再负延迟
        maxOp: 0.12 + Math.random() * 0.28, // 最高 0.12~0.40，克制的亮度
        isRound: isSinger,
        styleVariant: isSinger ? 'ring' : ['plain', 'glow', 'soft'][Math.floor(Math.random() * 3)],
      };
    });

    const handleStartGame = () => {
      setIsExiting(true);
      // 等待动画完成后切换页面
      setTimeout(() => setShowLanding(false), 550);
    };

    return (
      <section
        className={`landing-hero fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden px-4 text-center${isExiting ? ' landing-exiting' : ''}`}
      >
        {/* 专辑封面 + 歌手照片 闪烁粒子（数量增至 24，三档尺寸 + 多样式变体） */}
        {sparkles.map((p) => (
          <img
            key={`s${p.i}`}
            className={`album-sparkle${p.isRound ? ' rounded-full' : ''}${p.styleVariant === 'glow' ? ' sparkle-glow' : p.styleVariant === 'soft' ? ' sparkle-soft' : ''}`}
            src={p.src}
            alt=""
            style={{
              left: p.left,
              top: p.top,
              '--size': `${p.size}px`,
              '--dur': `${p.dur}s`,
              '--delay': `${p.delay}s`,
              '--max-op': p.maxOp,
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ))}

        {/* 黑胶纹路圈（微妙的装饰圆） */}
        <span className="glow-ring" style={{ width: '50vw', height: '50vw', top: '15%', left: '-15%', '--dur': '25s' }} aria-hidden="true" />
        <span className="glow-ring" style={{ width: '60vw', height: '60vw', bottom: '10%', right: '-20%', '--dur': '30s', animationDirection: 'reverse' }} aria-hidden="true" />

        {/* 大型半透明黑胶唱片（右上角背景装饰） */}
        <svg
          className="absolute pointer-events-none"
          style={{ width: 'min(520px, 80vw)', height: 'min(520px, 80vw)', right: '-14%', top:'-6%', opacity: 0.12, animation: 'vinylSpin 35s linear infinite' }}
          viewBox="0 0 400 400"
          aria-hidden="true"
        >
          {/* 唱片填充（深色底） */}
          <circle cx="200" cy="200" r="198" fill="rgba(18,10,30,0.7)" />
          {/* 唱片外圈 */}
          <circle cx="200" cy="200" r="196" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          {/* 同心纹路 */}
          {[185,170,155,140,125,110,95,80,65,50].map((r) => (
            <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
          ))}
          {/* 中心标签（紫红色，呼应品牌色） */}
          <circle cx="200" cy="200" r="38" fill="rgba(124,58,237,0.3)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
          {/* 中心孔 */}
          <circle cx="200" cy="200" r="4.5" fill="rgba(255,255,255,0.25)" />
          {/* 高光反射 */}
          <path d="M90 120 A 130 130 0 0 1 280 90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" strokeLinecap="round" />
        </svg>

        {/* 第二张黑胶（左下角，更淡、反向旋转） */}
        <svg
          className="absolute pointer-events-none"
          style={{ width: 'min(380px, 65vw)', height: 'min(380px, 65vw)', left: '-18%', bottom:'-12%', opacity: 0.08, animation: 'vinylSpin 50s linear infinite reverse' }}
          viewBox="0 0 400 400"
          aria-hidden="true"
        >
          <circle cx="200" cy="200" r="198" fill="rgba(18,10,30,0.6)" />
          <circle cx="200" cy="200" r="196" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
          {[180,160,140,120,100,80,60].map((r) => (
            <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" />
          ))}
          <circle cx="200" cy="200" r="34" fill="rgba(139,92,246,0.2)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <circle cx="200" cy="200" r="4" fill="rgba(255,255,255,0.2)" />
        </svg>

        {/* 底部渐变遮罩：保证按钮/文字在亮色区域可读 */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 92%, rgba(8,6,15,0.55) 0%, transparent 70%), linear-gradient(to bottom, transparent 60%, rgba(8,6,15,0.45) 100%)',
          }}
          aria-hidden="true"
        />

        {/* 底部光晕 */}
        <div className="bottom-glow" aria-hidden="true" />

        {/* 主题切换按钮 */}
        <button
          className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/20 text-base backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-white/30 hover:bg-black/30"
          type="button"
          onClick={toggleTheme}
          title="切换主题"
          aria-label="切换主题"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* 浮动 UI 层 */}
        <div className="relative z-10 flex flex-col items-center">
          {/* 纯代码品牌字标：克制霓虹 + SVG 皇冠 */}
          <div className="neon-brand" aria-label="SONG WORLD CUP">
            <svg className="neon-crown" viewBox="0 0 120 84" role="img" aria-label="皇冠">
              <defs>
                <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff3c8" />
                  <stop offset="40%" stopColor="#ffd54f" />
                  <stop offset="100%" stopColor="#e6a01f" />
                </linearGradient>
              </defs>
              <path
                d="M8 72 L8 40 L30 56 L48 22 L60 50 L72 22 L90 56 L112 40 L112 72 Z"
                fill="url(#crownGrad)"
                stroke="rgba(255,245,200,0.5)"
                strokeWidth="1.2"
              />
              <rect x="8" y="72" width="104" height="9" rx="3" fill="url(#crownGrad)" stroke="rgba(255,245,200,0.4)" strokeWidth="1" />
              <circle cx="60" cy="22" r="4.5" fill="#8b5cf6" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
            </svg>
            <div className="neon-line neon-upper">SONG WORLD</div>
            <div className="neon-line neon-lower">CUP</div>
          </div>

          {/* 副标题 */}
          <p
            className="mt-1 text-xs font-bold tracking-[0.5em] uppercase text-white/65 sm:text-sm"
            style={{ animation: 'landingFadeUp 0.6s ease-out 0.15s both', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
          >
            Music Tournament
          </p>

          {/* CTA 按钮 — 霓虹呼吸 */}
          <div style={{ animation: 'landingFadeUp 0.55s ease-out 0.3s both' }}>
            <button
              type="button"
              onClick={handleStartGame}
              className="neon-btn group relative mt-8 inline-flex cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-white/95 px-12 py-3.5 font-display text-lg font-bold text-[#3a1a5c] shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_40px_rgba(0,0,0,0.45)] active:translate-y-0 active:shadow-[0_4px_16px_rgba(0,0,0,0.25)] sm:mt-10 sm:px-14 sm:py-4"
            >
              <span className="relative z-10">开始游戏</span>
              <span className="relative z-10 text-base transition-transform duration-200 group-hover:translate-x-1">▶</span>
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* 说明文字 */}
          <p
            className="mt-6 max-w-[280px] text-[13px] leading-relaxed text-white/50 sm:max-w-[320px]"
            style={{ animation: 'landingFadeUp 0.5s ease-out 0.45s both', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
          >
            选择一种玩法、挑选你喜欢的歌手，<br />在二选一中决出你的终极冠军
          </p>

        </div>
      </section>
    );
  }

  return (
  <section className="relative px-2.5 pb-2.5 pt-9 text-center" style={{ animation: 'selectionRise 0.55s ease-out' }}>
    {/* 主题切换按钮 - 右上角 */}
    <button
      className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border-2 border-side-left/30 bg-bg2 text-sm transition-all hover:scale-110 hover:border-side-left/50"
      type="button"
      onClick={toggleTheme}
      title="切换主题"
      aria-label="切换主题"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>

      {/* Hero · 页面标题（已移除 BrandMark 大图 + 频谱条，更干净） */}
      <div className="mx-auto flex max-w-[1100px] flex-col items-center">
        <h1 className="mt-2 mb-1 font-display text-[clamp(24px,4.8vw,40px)] font-black leading-[1.15] tracking-tight text-ink text-balance">
          {isCustom
            ? '自选歌曲世界杯'
            : isCrossBattle
              ? '多歌手混战世界杯'
              : isRanking
                ? '夯到拉排名'
                : `${singer?.name}歌曲世界杯`}
        </h1>
        <p className="text-[13px] tracking-wide text-muted">
          {isCustom ? (
            <>
              {customBracketSize} 首歌曲 · 单败淘汰 · <b>二选一</b> 决出终极冠军
            </>
          ) : isClassic ? (
            <>
              {bracketSize} 首歌曲 · 单败淘汰 · <b>二选一</b> 决出终极冠军
            </>
          ) : isCrossBattle ? (
            <>
              多位歌手 · <b>公平分配</b> · 跨歌手对决决出终极冠军
            </>
          ) : isRanking ? (
            <>
              歌手/歌曲/专辑 · <b>分层排名</b> · 从最夯到最拉
            </>
          ) : (
            <>48 首歌曲 · 四选二小组赛+淘汰赛 · 决出终极冠军 · {wcSongMode === 'all' ? '全曲混战' : '热门出征'}</>
          )}
        </p>
      </div>

      <ModeSelector
        selected={selectedMode}
        onSelect={onSelectMode}
        bracketSize={bracketSize}
      />

      {/* Classic rules */}
      <div
        className={clsx(
          'mx-auto mb-6 max-w-[1100px] rounded-2xl border border-white/[0.06] bg-white/[0.015] text-left',
          rulesCollapsed.classic ? 'p-3.5 px-5' : 'p-5 px-5',
        )}
        style={{ display: isClassic ? 'block' : 'none' }}
      >
        <h3
          className="flex cursor-pointer items-center justify-between select-none mb-3 text-[15px] tracking-[0.5px] text-accent transition-colors duration-200 hover:text-ink"
          onClick={() => toggleRules('classic')}
        >
          <span>赛制说明 · 经典{bracketSize}强</span>
          <span className="ml-2 shrink-0 text-[11px] opacity-60">{rulesCollapsed.classic ? '▶' : '▼'}</span>
        </h3>
        <ul className={clsx('m-0 pl-[18px] [&_b]:text-ink [&_li]:my-[7px] [&_li]:text-[13.5px] [&_li]:text-muted [&_li]:[text-wrap:pretty]', rulesCollapsed.classic && 'hidden')}>
          <li>
            选曲原则：取 QQ 音乐收藏量前 {bracketSize}{' '}
            位，剔除所有英文歌曲及《北京欢迎你》《站起来》等多人合唱。
          </li>
          <li>
            种子排位：取 QQ 音乐<b>收藏量前 {Math.min(32, bracketSize)} 首</b>
            为种子选手，按标准赛制落入不同区域：<b>1-2 名</b>分入上下半区，<b>3-4 名</b>
            随机落入两个半区
            {bracketSize >= 8 ? (
              <>
                ，<b>5-8 名</b>分散至不同 1/4 区
              </>
            ) : (
              ''
            )}
            {bracketSize >= 16 ? (
              <>
                ，<b>9-16 名</b>分散至不同 1/8 区
              </>
            ) : (
              ''
            )}
            {bracketSize > 16 ? (
              <>
                ，<b>17-32 名</b>分散至不同 1/16 区
              </>
            ) : (
              ''
            )}
            {bracketSize > 32 ? `，其余 ${bracketSize - 32} 首随机填充。` : '。'}
          </li>
          <li>分区对阵：左半区（金色）与右半区（橙色）各自淘汰至一人会师决赛。</li>
          <li>
            玩法：每场从两首歌中<b>选一首晋级</b>，胜者进入下一轮，直到决出冠军。
          </li>
          <li>
            每次开始会<b>重新抽签</b>
            生成对阵，种子位固定但同层内随机分配，非种子完全随机。
          </li>
          <li>
            试听：点击卡片上的「试听」即可<b>页内播放</b>真实歌曲，
            <b>自动从高潮片段开始</b>，边听边选。
          </li>
          <li>纯娱乐性质，不具有任何官方性。</li>
        </ul>
      </div>

      {/* WC rules */}
      <div
        className={clsx(
          'mx-auto mb-6 max-w-[1100px] rounded-2xl border border-white/[0.06] bg-white/[0.015] text-left',
          rulesCollapsed.wc ? 'p-3.5 px-5' : 'p-5 px-5',
        )}
        style={{ display: selectedMode === 'wc' ? 'block' : 'none' }}
      >
        <h3
          className="flex cursor-pointer items-center justify-between select-none mb-3 text-[15px] tracking-[0.5px] text-accent transition-colors duration-200 hover:text-ink"
          onClick={() => toggleRules('wc')}
        >
          <span>赛制说明 · 世界杯模式</span>
          <span className="ml-2 shrink-0 text-[11px] opacity-60">{rulesCollapsed.wc ? '▶' : '▼'}</span>
        </h3>
        <ul className={clsx('m-0 pl-[18px] [&_b]:text-ink [&_li]:my-[7px] [&_li]:text-[13.5px] [&_li]:text-muted [&_li]:[text-wrap:pretty]', rulesCollapsed.wc && 'hidden')}>
          <li>
            <b>参赛歌曲</b>：可选两种玩法——<b>热门歌曲</b>取收藏量最高的{' '}
            <b>48 首</b>；<b>全部歌曲</b>随机选 48 首，<b>保证每张专辑至少 1 首</b>
            ，冷门佳作也有机会登场。
          </li>
          <li>
            <b>小组赛</b>：48 首按收藏量分 4 档抽签，分入 <b>12 个小组</b>
            （A–L），每组 4 首，每组 1 个种子选手。
          </li>
          <li>
            每组进行 <b>四选二</b>：从 4 首中直接选 2 首晋级，无需两两对决。选中的 2
            首按种子排名决出小组第一/第二；未选中的 2 首按种子排名决出第三/第四。
          </li>
          <li>
            <b>捞回 8 个</b>：12 个小组第三中，收藏量排名最优的 <b>8 首</b>获得外卡复活。
          </li>
          <li>
            <b>淘汰赛</b>：12 个小组第一 + 12 个小组第二 + 8 外卡 = <b>32 强</b>（24 出线
            + 8 捞回）。按种子排名落入标准 32 强对阵表。
          </li>
          <li>随后 32 强 → 16 强 → 8 强 → 4 强 → 决赛，决出终极冠军。</li>
          <li>
            每次开始会<b>重新抽签</b>，试听功能同样可用。
          </li>
          <li>纯娱乐性质，不具有任何官方性。</li>
        </ul>
      </div>

      {/* Custom rules */}
      <div
        className={clsx(
          'mx-auto mb-6 max-w-[1100px] rounded-2xl border border-white/[0.06] bg-white/[0.015] text-left',
          rulesCollapsed.custom ? 'p-3.5 px-5' : 'p-5 px-5',
        )}
        style={{ display: isCustom ? 'block' : 'none' }}
      >
        <h3
          className="flex cursor-pointer items-center justify-between select-none mb-3 text-[15px] tracking-[0.5px] text-accent transition-colors duration-200 hover:text-ink"
          onClick={() => toggleRules('custom')}
        >
          <span>赛制说明 · 自选模式</span>
          <span className="ml-2 shrink-0 text-[11px] opacity-60">{rulesCollapsed.custom ? '▶' : '▼'}</span>
        </h3>
        <ul className={clsx('m-0 pl-[18px] [&_b]:text-ink [&_li]:my-[7px] [&_li]:text-[13.5px] [&_li]:text-muted [&_li]:[text-wrap:pretty]', rulesCollapsed.custom && 'hidden')}>
          <li>
            先选择<b>淘汰赛规模</b>（4/8/16/32/64/128 强），再从下方歌曲列表中
            <b>自由勾选</b>参赛歌曲。
          </li>
          <li>
            选满所选规模数量即可开始，多选的歌曲会按<b>热度排序</b>取前 N 首。
          </li>
          <li>
            勾选完成后，歌曲将按<b>热度随机打乱</b>种子排位，<b>前两名</b>
            分入上下半区，后续按标准赛制分散落位。
          </li>
          <li>歌曲按专辑分组展示，可整专辑全选。</li>
          <li>玩法与经典模式相同：每场二选一，胜者晋级，直到决出冠军。</li>
          <li>
            自选模式<b>支持试听</b>，可边听边选。
          </li>
          <li>
            每次开始会<b>重新抽签</b>生成对阵。
          </li>
          <li>纯娱乐性质，不具有任何官方性。</li>
        </ul>
      </div>

      {/* Cross-battle rules */}
      <div
        className={clsx(
          'mx-auto mb-6 max-w-[1100px] rounded-2xl border border-white/[0.06] bg-white/[0.015] text-left',
          rulesCollapsed.cross ? 'p-3.5 px-5' : 'p-5 px-5',
        )}
        style={{ display: isCrossBattle ? 'block' : 'none' }}
      >
        <h3
          className="flex cursor-pointer items-center justify-between select-none mb-3 text-[15px] tracking-[0.5px] text-accent transition-colors duration-200 hover:text-ink"
          onClick={() => toggleRules('cross')}
        >
          <span>赛制说明 · 多歌手混战</span>
          <span className="ml-2 shrink-0 text-[11px] opacity-60">{rulesCollapsed.cross ? '▶' : '▼'}</span>
        </h3>
        <ul className={clsx('m-0 pl-[18px] [&_b]:text-ink [&_li]:my-[7px] [&_li]:text-[13.5px] [&_li]:text-muted [&_li]:[text-wrap:pretty]', rulesCollapsed.cross && 'hidden')}>
          <li>
            选择 <b>2-8 位歌手</b> 参战，可从内置歌手中选择，也可搜索添加更多歌手。
          </li>
          <li>
            系统从每位歌手中<b>等量取样</b>（按热度排序取前 N 首），确保公平。
          </li>
          <li>
            各歌手歌曲<b>交叉排列</b>，首轮<b>尽量避免同歌手内战</b>。
          </li>
          <li>
            玩法与经典模式相同：每场<b>二选一</b>，胜者晋级，直到决出跨歌手终极冠军。
          </li>
          <li>支持试听功能，每次开始重新抽签。</li>
          <li>纯娱乐性质，不具有任何官方性。</li>
        </ul>
      </div>

      {/* Ranking rules */}
      <div
        className={clsx(
          'mx-auto mb-6 max-w-[1100px] rounded-2xl border border-white/[0.06] bg-white/[0.015] text-left',
          rulesCollapsed.ranking ? 'p-3.5 px-5' : 'p-5 px-5',
        )}
        style={{ display: isRanking ? 'block' : 'none' }}
      >
        <h3
          className="flex cursor-pointer items-center justify-between select-none mb-3 text-[15px] tracking-[0.5px] text-accent transition-colors duration-200 hover:text-ink"
          onClick={() => toggleRules('ranking')}
        >
          <span>赛制说明 · 夯到拉排名</span>
          <span className="ml-2 shrink-0 text-[11px] opacity-60">{rulesCollapsed.ranking ? '▶' : '▼'}</span>
        </h3>
        <ul className={clsx('m-0 pl-[18px] [&_b]:text-ink [&_li]:my-[7px] [&_li]:text-[13.5px] [&_li]:text-muted [&_li]:[text-wrap:pretty]', rulesCollapsed.ranking && 'hidden')}>
          <li>
            选择排名对象：<b>歌曲</b>、<b>专辑</b> 或 <b>歌手</b>。
          </li>
          <li>
            系统将所有项目随机洗牌放入<b>待分类区</b>，你通过<b>拖拽</b>
            将每个项目分配到对应等级。
          </li>
          <li>
            5 个等级：<b>夯</b> → <b>顶级</b> → <b>人上人</b> → <b>NPC</b> → <b>拉完了</b>
            。
          </li>
          <li>
            <b>夯</b>的个数随总数递增：8个备选→2个夯，16个→3个夯； 其余等级数量
            <b>曲线递增</b>，<b>拉完了</b>最多。
          </li>
          <li>
            可随时<b>拖回</b>待分类区重新分配，也可使用<b>自动分配</b>快速完成。
          </li>
          <li>
            排名完成后展示完整的<b>分层排名</b>结果。
          </li>
          <li>纯娱乐性质，不具有任何官方性。</li>
        </ul>
      </div>

      {/* 世界杯：选曲玩法 */}
      {selectedMode === 'wc' && (
        <div className="mb-5 flex flex-wrap justify-center gap-2.5">
          <span className="mb-2 block w-full text-center text-[13px] font-semibold text-muted">
            参赛歌曲
          </span>
          {Object.entries(WC_SONG_MODES).map(([value, info]) => (
            <PillButton
              key={value}
              active={wcSongMode === value}
              onClick={() => onWcSongModeChange?.(value)}
            >
              {info.label}
            </PillButton>
          ))}
          <span className="mt-1 w-full text-center text-xs text-muted">
            {wcSongMode === 'all'
              ? '随机选歌，每张专辑至少 1 首 · 冷门佳作也有机会登场'
              : '取收藏量最高的歌曲参赛'}
          </span>
        </div>
      )}

      {/* 歌手选择（仅经典/世界杯/自选模式显示，排名和混战完全隐藏） */}
      {!isCrossBattle && !isRanking && (
        <CoverWallSelector
          singers={singers}
          current={currentSinger}
          onSelect={onSelectSinger}
          searchKeyword={searchKeyword}
          onSearch={onSearch}
          searchResults={searchResults}
          isSearching={isSearching}
          dynamicSinger={dynamicSinger}
          isLoadingSinger={isLoadingSinger}
          loadingProgress={loadingProgress}
          onLoadSinger={onLoadSinger}
          onClearDynamicSinger={onClearDynamicSinger}
          singerLoading={singerLoading}
        />
      )}

      {/* 跨歌手混战：多选歌手选择器 */}
      {isCrossBattle && (
        <>
          {/* 对决类型选择器 - 使用优化后的 Tab 样式 */}
          <div className="mb-4 flex flex-wrap justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5">
            {[
              { value: 'songs', label: '歌曲' },
              { value: 'albums', label: '专辑' },
              { value: 'singers', label: '歌手' },
            ].map((opt) => (
              <PillButton
                key={opt.value}
                active={crossBattleType === opt.value}
                onClick={() => onCrossBattleTypeChange?.(opt.value)}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
          <CrossSingerSelector
            selectedSingers={crossSelectedSingers}
            onToggleSinger={onCrossToggleSinger}
            singerDataMap={crossSingerDataMap}
            loading={crossLoading}
            bracketSize={selectedSize}
            onSelectSize={onSelectSize}
            availableSizes={crossAvailableSizes}
            mode="cross-battle"
            crossSearchKeyword={crossSearchKeyword}
            onCrossSearch={onCrossSearch}
            crossSearchResults={crossSearchResults}
            isCrossSearching={isCrossSearching}
            onAddDynamicSinger={onAddDynamicSinger}
            dynamicSingers={crossDynamicSingers}
            loadingMids={crossLoadingMids}
            crossBattleType={crossBattleType}
            crossTotalItems={crossTotalItems}
          />
        </>
      )}

      {/* 夯到拉排名：排名范围 + 子模式选择 */}
      {isRanking && (
        <div className="mb-4 flex flex-col gap-3">
          {/* 排名范围：单歌手 / 多歌手 */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="w-full mb-1 text-center text-[13px] font-semibold text-muted">排名范围</span>
            <div className="flex flex-wrap justify-center gap-2.5">
              {[
                { value: 'single', label: '单歌手' },
                { value: 'cross', label: '多歌手' },
              ].map((opt) => (
                <PillButton
                  key={opt.value}
                  active={rankingScope === opt.value}
                  onClick={() => {
                    onRankingScopeChange?.(opt.value);
                    // 切换范围时重置子模式
                    if (opt.value === 'single') {
                      onRankingSubModeChange?.('all-songs');
                    } else {
                      onRankingSubModeChange?.('songs');
                    }
                  }}
                >
                  {opt.label}
                </PillButton>
              ))}
            </div>
          </div>

          {/* 单歌手：子模式选择 */}
          {rankingScope === 'single' && (
            <>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="w-full mb-1 text-center text-[13px] font-semibold text-muted">排名对象</span>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {[
                    { value: 'all-songs', label: '所有歌曲' },
                    { value: 'album-songs', label: '专辑内歌曲' },
                    { value: 'top-x', label: '收藏量前N' },
                    { value: 'all-albums', label: '所有专辑' },
                  ].map((opt) => (
                    <PillButton
                      key={opt.value}
                      active={rankingSubMode === opt.value}
                      onClick={() => onRankingSubModeChange?.(opt.value)}
                    >
                      {opt.label}
                    </PillButton>
                  ))}
                </div>
              </div>

              {/* 专辑内歌曲：选择专辑（卡片式） */}
              {rankingSubMode === 'album-songs' && baseSingerData?.entrants && (
                <div className="mb-3 flex flex-col gap-2">
                  <span className="w-full mb-1 text-center text-[13px] font-semibold text-muted">选择专辑</span>
                  <div className="grid max-h-70 gap-2 overflow-y-auto rounded-[10px] bg-black/15 p-1 [grid-template-columns:repeat(auto-fill,minmax(80px,1fr))]">
                    <div
                      className={clsx(
                        'flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-transparent bg-white/3 p-1.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/8',
                        !rankingAlbumMid &&
                          'border-accent bg-accent/10',
                      )}
                      onClick={() => onRankingAlbumMidChange?.('')}
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg3 text-[28px]">
                        <span className="text-muted">♪</span>
                      </div>
                      <span className="line-clamp-2 text-[11px] leading-[1.3] text-ink [word-break:break-all]">全部歌曲</span>
                    </div>
                    {(() => {
                      const albumMap = new Map();
                      for (const e of baseSingerData.entrants) {
                        const key = e.albumMid || e.albumName;
                        if (key && !albumMap.has(key)) {
                          albumMap.set(key, {
                            name: e.albumName || key,
                            pic:
                              e.picLocal ||
                              e.pic ||
                              (e.albumMid ? coverUrl(e.albumMid) : ''),
                            date: e.albumDate || '',
                            count: 0,
                          });
                        }
                        if (key) albumMap.get(key).count++;
                      }
                      return [...albumMap.entries()]
                        .sort(([, a], [, b]) =>
                          (a.date || '').localeCompare(b.date || ''),
                        )
                        .map(([key, info]) => (
                          <div
                            key={key}
                            className={clsx(
                              'flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-transparent bg-white/3 p-1.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/8',
                              rankingAlbumMid === key &&
                                'border-accent bg-accent/10',
                            )}
                            onClick={() => onRankingAlbumMidChange?.(key)}
                          >
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg3 text-[28px]">
                              {info.pic ? (
                                <img
                                  src={info.pic}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    const tried = img.dataset.tried || '';
                                    if (tried.includes('qq')) { img.style.display = 'none'; return; }
                                    if (tried === 'jsdelivr') { img.dataset.tried = 'jsdelivr,qq'; const midMatch = String(key).match(/^(\d+)$/); if (midMatch) img.src = qqCoverUrl(midMatch[1]); else img.style.display = 'none'; return; }
                                    if (!tried) { img.dataset.tried = 'jsdelivr'; const midMatch = String(key).match(/^(\d+)$/); if (midMatch) img.src = jsDelivrCoverUrl(midMatch[1]); else img.style.display = 'none'; return; }
                                    img.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="text-muted">◎</span>
                              )}
                            </div>
                            <span className="line-clamp-2 text-[11px] leading-[1.3] text-ink [word-break:break-all]">{info.name}</span>
                            <span className="text-[10px] text-ink/40">
                              {info.count}首
                            </span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              )}

              {/* 收藏量前N：选择N */}
              {rankingSubMode === 'top-x' && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="w-full mb-1 text-center text-[13px] font-semibold text-muted">取前几首</span>
                  <div className="flex flex-wrap justify-center gap-2.5">
                    {[8, 16, 32, 64].map((n) => (
                      <PillButton
                        key={n}
                        active={rankingTopX === n}
                        onClick={() => onRankingTopXChange?.(n)}
                      >
                        {n}首
                      </PillButton>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 多歌手：子模式选择 */}
          {rankingScope === 'cross' && (
            <>
              <CrossSingerSelector
                selectedSingers={crossSelectedSingers}
                onToggleSinger={onCrossToggleSinger}
                singerDataMap={crossSingerDataMap}
                loading={crossLoading}
                mode="ranking"
                crossSearchKeyword={crossSearchKeyword}
                onCrossSearch={onCrossSearch}
                crossSearchResults={crossSearchResults}
                isCrossSearching={isCrossSearching}
                onAddDynamicSinger={onAddDynamicSinger}
                dynamicSingers={crossDynamicSingers}
                loadingMids={crossLoadingMids}
              />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="w-full mb-1 text-center text-[13px] font-semibold text-muted">排名对象</span>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {[
                    { value: 'songs', label: '歌曲' },
                    { value: 'albums', label: '专辑' },
                    { value: 'singers', label: '歌手' },
                  ].map((opt) => (
                    <PillButton
                      key={opt.value}
                      active={rankingSubMode === opt.value}
                      onClick={() => onRankingSubModeChange?.(opt.value)}
                    >
                      {opt.label}
                    </PillButton>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 自选模式：先选规模 */}
      {isCustom && customAllSizes.length > 1 && (
        <div className="mb-5 flex flex-wrap justify-center gap-2.5">
          <span className="mb-2 block w-full text-center text-[13px] font-semibold text-muted">
            淘汰赛规模
          </span>
          {customAllSizes.map((size) => (
            <PillButton
              key={size}
              active={customBracketSize === size}
              onClick={() => onSelectSize(size)}
            >
              {size}强
            </PillButton>
          ))}
        </div>
      )}

      {/* 自选模式：歌曲选择器 */}
      {isCustom && customEntrants && (
        <SongPicker
          entrants={customEntrants}
          selectedIds={customSelectedIds || new Set()}
          onChange={onCustomSelectedChange}
          selectedSize={customBracketSize}
          onSelectSize={onSelectSize}
          onPreview={onPreview}
          playingId={playingId}
          previewLoading={previewLoading}
          isPlaying={isPlaying}
        />
      )}

      {/* 经典模式：规模选择器（仅当有多种规模可选时显示） */}
      {isClassic && availableSizes.length > 1 && (
        <div className="mb-5 flex flex-wrap justify-center gap-2.5">
          <span className="mb-2 block w-full text-center text-[13px] font-semibold text-muted">
            淘汰赛规模
          </span>
          {availableSizes.map((size) => (
            <PillButton
              key={size}
              active={bracketSize === size}
              onClick={() => onSelectSize(size)}
            >
              {size}强
            </PillButton>
          ))}
        </div>
      )}

      <button
        className="relative inline-flex w-full max-w-[320px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-accent bg-accent px-8 py-4 font-display text-lg font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-[0_2px_8px_rgba(0,0,0,0.15)] disabled:cursor-default disabled:opacity-50 sm:w-auto sm:px-12"
        onClick={onStart}
        type="button"
        disabled={
          (isCustom && !canStartCustom) ||
          (isCrossBattle && !canStartCross) ||
          (selectedMode === 'wc' && !wcCanStart)
        }
      >
        {isCustom
          ? `开始 ${customBracketSize} 强`
          : isCrossBattle
            ? '开始混战'
            : isRanking
              ? '开始排名'
              : selectedMode === 'wc'
                ? '开始世界杯'
                : `开始 ${bracketSize} 强`}
      </button>

      {showResume && !isCustom && !isCrossBattle && !isRanking && (
        <button
          className="ml-2.5 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-muted transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.96]"
          onClick={onResume}
          type="button"
        >
          {resumeLabel}
        </button>
      )}

      <div className="mt-3.5 text-xs text-muted">
        {isCustom
          ? '提示：点击歌曲勾选/取消 · 可按专辑全选 · 每次开始对阵随机生成'
          : isCrossBattle
            ? '提示：选择 2-8 位歌手 · 每位歌手歌曲数量一致 · 首轮避免同歌手对决'
            : isRanking
              ? '提示：逐个将项目分配到等级 · 等级容量按曲线递增 · 支持撤销'
              : '提示：可用键盘 ← 选左、→ 选右 · 每次开始对阵随机生成'}
      </div>

      {/* 成就墙 */}
      {achievements && (
        <div className="mt-8">
          <AchievementWall unlocked={achievements} />
        </div>
      )}
    </section>
  );
}
