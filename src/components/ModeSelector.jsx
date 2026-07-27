import React from 'react';
import { clsx } from 'clsx';

/**
 * Mode selection (classic / world cup / custom).
 * @param {'classic'|'wc'|'custom'} selected - currently selected mode
 * @param {(mode: 'classic'|'wc'|'custom') => void} onSelect - callback when a mode is selected
 * @param {number} bracketSize - bracket size number for the classic mode label
 */
export default function ModeSelector({ selected, onSelect, bracketSize }) {
  return (
    <div className="mode-select">
      <div
        className={clsx('mode-btn', { active: selected === 'classic' })}
        onClick={() => onSelect('classic')}
      >
        <span className="mode-ico">🏆</span>
        <span className="mode-title">经典 {bracketSize} 强</span>
        <span className="mode-desc">
          单败淘汰
          <br />
          种子排位 · {bracketSize - 1} 场
        </span>
      </div>
      <div
        className={clsx('mode-btn', 'wc-btn', { active: selected === 'wc' })}
        onClick={() => onSelect('wc')}
      >
        <span className="mode-ico">⚽</span>
        <span className="mode-title">世界杯模式</span>
        <span className="mode-desc">
          12 组循环赛 + 捞回8个
          <br />
          32强淘汰赛 · ~103 场
        </span>
      </div>
      <div
        className={clsx('mode-btn', 'custom-btn', { active: selected === 'custom' })}
        onClick={() => onSelect('custom')}
      >
        <span className="mode-ico">✏️</span>
        <span className="mode-title">自选模式</span>
        <span className="mode-desc">
          自定义歌曲
          <br />
          单败淘汰 · 随心对战
        </span>
      </div>
    </div>
  );
}
