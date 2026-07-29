import React, { useState } from 'react';
import { clsx } from 'clsx';
import TrophySvg from './TrophySvg.jsx';
import SingerSelector from './SingerSelector.jsx';
import ModeSelector from './ModeSelector.jsx';
import SongPicker from './SongPicker.jsx';
import CrossSingerSelector from './CrossSingerSelector.jsx';
import { classicOptions } from '../data/singers.js';

/**
 * Start / hero screen.
 * @param {object} singer - current singer object {name, nameEn, bracketSize}
 * @param {'classic'|'wc'|'custom'} selectedMode - currently selected mode
 * @param {(mode: 'classic'|'wc'|'custom') => void} onSelectMode - mode selection callback
 * @param {() => void} onStart - called when the start button is clicked
 * @param {boolean} hasSaved - whether there is a saved classic game
 * @param {boolean} hasSavedWC - whether there is a saved WC game
 * @param {() => void} onResume - called when the resume button is clicked
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
  // 夯到拉排名 props
  rankingCategory,
  onRankingCategoryChange,
}) {
  const isClassic = selectedMode === 'classic';
  const isCustom = selectedMode === 'custom';
  const isCrossBattle = selectedMode === 'cross-battle';
  const isRanking = selectedMode === 'ranking';

  // 赛制说明折叠状态（默认展开）
  const [rulesCollapsed, setRulesCollapsed] = useState({
    classic: false,
    wc: false,
    custom: false,
    cross: false,
    ranking: false,
  });
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
  const showResume = (isClassic || isCustom)
    ? hasSaved || hasSavedWC
    : hasSavedWC || hasSaved;
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
    <section className="hero">
      <TrophySvg size={104} />
      <h1>
        {isCustom
          ? '自选歌曲世界杯'
          : isCrossBattle
            ? '多歌手混战世界杯'
            : isRanking
              ? '夯到拉排名'
              : `${singer?.name}歌曲世界杯`}
      </h1>
      <p className="sub">
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
          <>
            48 首歌曲 · 四选二小组赛+淘汰赛 · 决出终极冠军
          </>
        )}
      </p>

      {/* Classic rules */}
      <div
        className={clsx('rules', { collapsed: rulesCollapsed.classic })}
        style={{ display: isClassic ? 'block' : 'none' }}
      >
        <h3
          className="rules-toggle"
          onClick={() => toggleRules('classic')}
        >
          <span>赛制说明 · 经典{bracketSize}强</span>
          <span className="rules-arrow">
            {rulesCollapsed.classic ? '▶' : '▼'}
          </span>
        </h3>
        <ul>
          <li>
            选曲原则：取 QQ 音乐收藏量前 {bracketSize}{' '}
            位，剔除所有英文歌曲及《北京欢迎你》《站起来》等多人合唱。
          </li>
          <li>
            种子排位：取 QQ 音乐<b>收藏量前 {Math.min(32, bracketSize)} 首</b>
            为种子选手，按标准赛制落入不同区域：<b>1-2 名</b>分入上下半区，<b>3-4 名</b>
            随机落入两个半区{bracketSize >= 8 ? (<>，<b>5-8 名</b>分散至不同 1/4 区</>) : ''}
            {bracketSize >= 16 ? (<>，<b>9-16 名</b>分散至不同 1/8 区</>) : ''}
            {bracketSize > 16 ? (<>，<b>17-32 名</b>分散至不同 1/16 区</>) : ''}
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
        className={clsx('rules', 'wc-rules', {
          collapsed: rulesCollapsed.wc,
        })}
        style={{ display: selectedMode === 'wc' ? 'block' : 'none' }}
      >
        <h3
          className="rules-toggle"
          onClick={() => toggleRules('wc')}
        >
          <span>赛制说明 · 世界杯模式</span>
          <span className="rules-arrow">
            {rulesCollapsed.wc ? '▶' : '▼'}
          </span>
        </h3>
        <ul>
          <li>
            <b>小组赛</b>：取 QQ 音乐收藏量前 <b>48 首</b>，按收藏量分 4 档抽签，分入{' '}
            <b>12 个小组</b>（A–L），每组 4 首，每组 1 个种子选手。
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
        className={clsx('rules', { collapsed: rulesCollapsed.custom })}
        style={{ display: isCustom ? 'block' : 'none' }}
      >
        <h3
          className="rules-toggle"
          onClick={() => toggleRules('custom')}
        >
          <span>赛制说明 · 自选模式</span>
          <span className="rules-arrow">
            {rulesCollapsed.custom ? '▶' : '▼'}
          </span>
        </h3>
        <ul>
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
        className={clsx('rules', { collapsed: rulesCollapsed.cross })}
        style={{ display: isCrossBattle ? 'block' : 'none' }}
      >
        <h3
          className="rules-toggle"
          onClick={() => toggleRules('cross')}
        >
          <span>赛制说明 · 多歌手混战</span>
          <span className="rules-arrow">
            {rulesCollapsed.cross ? '▶' : '▼'}
          </span>
        </h3>
        <ul>
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
        className={clsx('rules', { collapsed: rulesCollapsed.ranking })}
        style={{ display: isRanking ? 'block' : 'none' }}
      >
        <h3
          className="rules-toggle"
          onClick={() => toggleRules('ranking')}
        >
          <span>赛制说明 · 夯到拉排名</span>
          <span className="rules-arrow">
            {rulesCollapsed.ranking ? '▶' : '▼'}
          </span>
        </h3>
        <ul>
          <li>
            选择排名对象：<b>歌曲</b>、<b>专辑</b> 或 <b>歌手</b>。
          </li>
          <li>
            系统将所有项目随机洗牌后逐一展示，你将每个项目分配到 5 个等级之一。
          </li>
          <li>
            5 个等级从<b>最夯</b>到<b>最拉</b>，每个等级的容量<b>按曲线递增</b>：
            最夯 1 个 → 很夯 2 个 → 还行 4 个 → 一般 8 个 → 拉 16 个。
          </li>
          <li>
            当某等级已满时，该按钮自动禁用，需将项目分配到其他等级。
          </li>
          <li>支持<b>撤销</b>操作，随时查看当前排名进度。</li>
          <li>排名完成后展示完整的<b>分层排名</b>结果。</li>
          <li>纯娱乐性质，不具有任何官方性。</li>
        </ul>
      </div>

      {/* 歌手选择（经典/世界杯/自选/排名模式显示，混战模式使用自己的多选器） */}
      {!isCrossBattle && (
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
        />
      )}

      {/* 夯到拉排名：选择排名对象 */}
      {isRanking && (
        <div className="size-selector">
          <span className="size-label">排名对象</span>
          <div className="size-btns">
            {[
              { value: 'song', label: '歌曲' },
              { value: 'album', label: '专辑' },
              { value: 'singer', label: '歌手' },
            ].map((opt) => (
              <button
                key={opt.value}
                className={clsx('size-btn', { active: rankingCategory === opt.value })}
                onClick={() => onRankingCategoryChange?.(opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <ModeSelector
        selected={selectedMode}
        onSelect={onSelectMode}
        bracketSize={bracketSize}
      />

      {/* 自选模式：先选规模 */}
      {isCustom && customAllSizes.length > 1 && (
        <div className="size-selector">
          <span className="size-label">淘汰赛规模</span>
          <div className="size-btns">
            {customAllSizes.map((size) => (
              <button
                key={size}
                className={clsx('size-btn', { active: customBracketSize === size })}
                onClick={() => onSelectSize(size)}
                type="button"
              >
                {size}强
              </button>
            ))}
          </div>
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
        <div className="size-selector">
          <span className="size-label">淘汰赛规模</span>
          <div className="size-btns">
            {availableSizes.map((size) => (
              <button
                key={size}
                className={clsx('size-btn', { active: bracketSize === size })}
                onClick={() => onSelectSize(size)}
                type="button"
              >
                {size}强
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        className="btn primary start-cta"
        onClick={onStart}
        type="button"
        disabled={
          (isCustom && !canStartCustom) ||
          (isCrossBattle && !canStartCross)
        }
      >
        {isCustom
          ? `🏆 开始 ${customBracketSize} 强`
          : isCrossBattle
            ? `⚔️ 开始混战`
            : isRanking
              ? '📊 开始排名'
              : selectedMode === 'wc'
                ? '⚽ 开始世界杯'
                : `🏆 开始 ${bracketSize} 强`}
      </button>

      {showResume && !isCustom && !isCrossBattle && !isRanking && (
        <button
          className="btn"
          onClick={onResume}
          type="button"
          style={{ marginLeft: 10 }}
        >
          {resumeLabel}
        </button>
      )}

      <div className="hint">
        {isCustom
          ? '提示：点击歌曲勾选/取消 · 可按专辑全选 · 每次开始对阵随机生成'
          : isCrossBattle
            ? '提示：选择 2-8 位歌手 · 每位歌手歌曲数量一致 · 首轮避免同歌手对决'
            : isRanking
              ? '提示：逐个将项目分配到等级 · 等级容量按曲线递增 · 支持撤销'
              : '提示：可用键盘 ← 选左、→ 选右 · 每次开始对阵随机生成'}
      </div>
    </section>
  );
}
