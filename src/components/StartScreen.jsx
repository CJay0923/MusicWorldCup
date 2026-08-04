import React, { useState } from 'react';
import { clsx } from 'clsx';
import TrophySvg from './TrophySvg.jsx';
import SingerSelector from './SingerSelector.jsx';
import ModeSelector from './ModeSelector.jsx';
import SongPicker from './SongPicker.jsx';
import CrossSingerSelector from './CrossSingerSelector.jsx';
import PillButton from './ui/PillButton.jsx';
import { coverUrl, jsDelivrCoverUrl } from '../lib/assets';
import { classicOptions, WC_SONG_MODES } from '../data/singers.js';
import AchievementWall from './AchievementWall.jsx';

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

return (
  <section className="relative px-2.5 pb-2.5 pt-14 text-center">
    {/* 主题切换按钮 - 右上角 */}
    <button
      className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border-2 border-side-left/30 bg-bg2 text-sm transition-all hover:scale-110 hover:border-side-left/50"
      type="button"
      onClick={() => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        setTheme(next);
      }}
      title="切换主题"
      aria-label="切换主题"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>

      <TrophySvg size={120} />
      <h1 className="mx-0 mb-1.5 mt-[18px] font-display text-[clamp(30px,6vw,52px)] font-black leading-[1.15] tracking-tight text-ink text-balance">
        {isCustom
          ? '自选歌曲世界杯'
          : isCrossBattle
            ? '多歌手混战世界杯'
            : isRanking
              ? '夯到拉排名'
              : `${singer?.name}歌曲世界杯`}
      </h1>
      <p className="mb-8 text-[15px] tracking-wide text-muted">
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

      <ModeSelector
        selected={selectedMode}
        onSelect={onSelectMode}
        bracketSize={bracketSize}
      />

      {/* Classic rules */}
      <div
        className={clsx(
          'mx-auto mb-8 max-w-[680px] rounded-2xl border border-white/[0.08] bg-white/[0.03] text-left shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
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
          'mx-auto mb-8 max-w-[680px] rounded-2xl border border-white/[0.08] bg-white/[0.03] text-left shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
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
          'mx-auto mb-8 max-w-[680px] rounded-2xl border border-white/[0.08] bg-white/[0.03] text-left shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
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
          'mx-auto mb-8 max-w-[680px] rounded-2xl border border-white/[0.08] bg-white/[0.03] text-left shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
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
          'mx-auto mb-8 max-w-[680px] rounded-2xl border border-white/[0.08] bg-white/[0.03] text-left shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
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
        <SingerSelector
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
                                    const tried = img.dataset.tried;
                                    if (tried) { img.style.display = 'none'; return; }
                                    img.dataset.tried = '1';
                                    // key might be albumMid or albumName; try extracting numeric mid
                                    const midMatch = String(key).match(/^(\d+)$/);
                                    if (midMatch) { img.src = jsDelivrCoverUrl(midMatch[1]); }
                                    else { img.style.display = 'none'; }
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
