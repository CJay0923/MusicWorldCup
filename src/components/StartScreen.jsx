import React from 'react';
import { clsx } from 'clsx';
import TrophySvg from './TrophySvg.jsx';
import SingerSelector from './SingerSelector.jsx';
import ModeSelector from './ModeSelector.jsx';
import SongPicker from './SongPicker.jsx';
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
}) {
  const isClassic = selectedMode === 'classic';
  const isCustom = selectedMode === 'custom';
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

  // Decide whether to show the resume button and its label
  const showResume = isClassic
    ? hasSaved || hasSavedWC
    : isCustom
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
      <h1>{isCustom ? '自选歌曲世界杯' : `${singer?.name}歌曲世界杯`}</h1>
      <p className="sub">
        {isCustom ? (
          <>
            {customBracketSize} 首歌曲 · 单败淘汰 · <b>二选一</b> 决出终极冠军
          </>
        ) : isClassic ? (
          <>
            {bracketSize} 首歌曲 · 单败淘汰 · <b>二选一</b> 决出终极冠军
          </>
        ) : (
          <>
            48 首歌曲 · 小组赛+淘汰赛 · <b>二选一</b> 决出终极冠军
          </>
        )}
      </p>

      {/* Classic rules */}
      <div className="rules" style={{ display: isClassic ? 'block' : 'none' }}>
        <h3>赛制说明 · 经典{bracketSize}强</h3>
        <ul>
          <li>
            选曲原则：取 QQ 音乐收藏量前 {bracketSize}{' '}
            位，剔除所有英文歌曲及《北京欢迎你》《站起来》等多人合唱。
          </li>
          <li>
            种子排位：取 QQ 音乐<b>收藏量前 {Math.min(32, bracketSize)} 首</b>
            为种子选手，按标准赛制落入不同区域：<b>1-2 名</b>分入上下半区，<b>3-4 名</b>
            随机落入两个半区{bracketSize >= 8 ? '，<b>5-8 名</b>分散至不同 1/4 区' : ''}
            {bracketSize >= 16 ? '，<b>9-16 名</b>分散至不同 1/8 区' : ''}
            {bracketSize > 16 ? '，<b>17-32 名</b>分散至不同 1/16 区' : ''}
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
        className={clsx('rules', 'wc-rules', { show: !isClassic })}
        style={{ display: !isClassic && !isCustom ? 'block' : 'none' }}
      >
        <h3>赛制说明 · 世界杯模式</h3>
        <ul>
          <li>
            <b>小组赛</b>：取 QQ 音乐收藏量前 <b>48 首</b>，按收藏量分 4 档抽签，分入{' '}
            <b>12 个小组</b>（A–L），每组 4 首，每组 1 个种子选手。
          </li>
          <li>
            每组进行 <b>单循环赛</b>（6 场），每首与其他 3 首各比一次，按胜场排名决出前{' '}
            <b>2 名</b>出线。
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
      <div className="rules" style={{ display: isCustom ? 'block' : 'none' }}>
        <h3>赛制说明 · 自选模式</h3>
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

      {/* 歌手选择（所有模式都显示，自选模式也需要选歌手来确定歌曲池） */}
      <SingerSelector
        singers={singers}
        current={currentSinger}
        onSelect={onSelectSinger}
      />

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
        disabled={isCustom && !canStartCustom}
      >
        {isCustom
          ? `🏆 开始 ${customBracketSize} 强`
          : selectedMode === 'wc'
            ? '⚽ 开始世界杯'
            : `🏆 开始 ${bracketSize} 强`}
      </button>

      {showResume && !isCustom && (
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
          : '提示：可用键盘 ← 选左、→ 选右 · 每次开始对阵随机生成'}
      </div>
    </section>
  );
}
