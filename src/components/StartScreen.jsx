import React, { useState } from 'react';
import TrophySvg from './TrophySvg.jsx';
import SingerSelector from './SingerSelector.jsx';
import ModeSelector from './ModeSelector.jsx';
import { classicOptions } from '../data/singers.js';

/**
 * Start / hero screen.
 * @param {object} singer - current singer object {name, nameEn, bracketSize}
 * @param {'classic'|'wc'} selectedMode - currently selected mode
 * @param {(mode: 'classic'|'wc') => void} onSelectMode - mode selection callback
 * @param {() => void} onStart - called when the start button is clicked
 * @param {boolean} hasSaved - whether there is a saved classic game
 * @param {boolean} hasSavedWC - whether there is a saved WC game
 * @param {() => void} onResume - called when the resume button is clicked
 * @param {object} singers - SINGERS object
 * @param {string} currentSinger - current singer id
 * @param {(id: string) => void} onSelectSinger - singer selection callback
 * @param {number} selectedSize - selected classic bracket size
 * @param {(size: number) => void} onSelectSize - bracket size selection callback
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
}) {
  const maxBracket = singer?.bracketSize || 128;
  const availableSizes = classicOptions(maxBracket);
  const bracketSize = selectedSize || availableSizes[0] || maxBracket;
  const isClassic = selectedMode === 'classic';

  // Decide whether to show the resume button and its label
  const showResume = isClassic
    ? hasSaved || hasSavedWC
    : hasSavedWC || hasSaved;
  const resumeLabel = (() => {
    if (isClassic) {
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
      <h1>{singer?.name}歌曲世界杯</h1>
      <p className="sub">
        {isClassic
          ? <>{bracketSize} 首歌曲 · 单败淘汰 · <b>二选一</b> 决出终极冠军</>
          : <>48 首歌曲 · 小组赛+淘汰赛 · <b>二选一</b> 决出终极冠军</>}
      </p>

      {/* Classic rules */}
      <div
        className="rules"
        style={{ display: isClassic ? 'block' : 'none' }}
      >
        <h3>赛制说明 · 经典{bracketSize}强</h3>
        <ul>
          <li>选曲原则：取 QQ 音乐收藏量前 {bracketSize} 位，剔除所有英文歌曲及《北京欢迎你》《站起来》等多人合唱。</li>
          <li>种子排位：取 QQ 音乐<b>收藏量前 32 首</b>为种子选手，按标准赛制落入不同区域：<b>1-2 名</b>分入上下半区，<b>3-4 名</b>随机落入两个半区，<b>5-8 名</b>分散至不同 1/4 区，<b>9-16 名</b>分散至不同 1/8 区，<b>17-32 名</b>分散至不同 1/16 区，其余 {bracketSize - 32} 首随机填充。</li>
          <li>分区对阵：左半区（金色）与右半区（橙色）各自淘汰至一人会师决赛。</li>
          <li>玩法：每场从两首歌中<b>选一首晋级</b>，胜者进入下一轮，直到决出冠军。</li>
          <li>每次开始会<b>重新抽签</b>生成对阵，种子位固定但同层内随机分配，非种子完全随机。</li>
          <li>试听：点击卡片上的「试听」即可<b>页内播放</b>真实歌曲，<b>自动从高潮片段开始</b>，边听边选。</li>
          <li>纯娱乐性质，不具有任何官方性。</li>
        </ul>
      </div>

      {/* WC rules */}
      <div
        className={`rules wc-rules${isClassic ? '' : ' show'}`}
        style={{ display: isClassic ? 'none' : 'block' }}
      >
        <h3>赛制说明 · 世界杯模式</h3>
        <ul>
          <li><b>小组赛</b>：取 QQ 音乐收藏量前 <b>48 首</b>，按收藏量分 4 档抽签，分入 <b>12 个小组</b>（A–L），每组 4 首，每组 1 个种子选手。</li>
          <li>每组进行 <b>单循环赛</b>（6 场），每首与其他 3 首各比一次，按胜场排名决出前 <b>2 名</b>出线。</li>
          <li><b>捞回 8 个</b>：12 个小组第三中，收藏量排名最优的 <b>8 首</b>获得外卡复活。</li>
          <li><b>淘汰赛</b>：12 个小组第一 + 12 个小组第二 + 8 外卡 = <b>32 强</b>（24 出线 + 8 捞回）。按种子排名落入标准 32 强对阵表。</li>
          <li>随后 32 强 → 16 强 → 8 强 → 4 强 → 决赛，决出终极冠军。</li>
          <li>每次开始会<b>重新抽签</b>，试听功能同样可用。</li>
          <li>纯娱乐性质，不具有任何官方性。</li>
        </ul>
      </div>

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

      {/* 经典模式：规模选择器（仅当有多种规模可选时显示） */}
      {isClassic && availableSizes.length > 1 && (
        <div className="size-selector">
          <span className="size-label">淘汰赛规模</span>
          <div className="size-btns">
            {availableSizes.map(size => (
              <button
                key={size}
                className={`size-btn${bracketSize === size ? ' active' : ''}`}
                onClick={() => onSelectSize(size)}
                type="button"
              >
                {size}强
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="btn primary start-cta" onClick={onStart} type="button">
        {selectedMode === 'wc' ? '⚽ 开始世界杯' : `🏆 开始 ${bracketSize} 强`}
      </button>

      {showResume && (
        <button
          className="btn"
          onClick={onResume}
          type="button"
          style={{ marginLeft: 10 }}
        >
          {resumeLabel}
        </button>
      )}

      <div className="hint">提示：可用键盘 ← 选左、→ 选右 · 每次开始对阵随机生成</div>
    </section>
  );
}
