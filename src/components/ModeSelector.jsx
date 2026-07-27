import React from 'react';

/**
 * Mode selection (classic / world cup).
 * @param {'classic'|'wc'} selected - currently selected mode
 * @param {(mode: 'classic'|'wc') => void} onSelect - callback when a mode is selected
 * @param {number} bracketSize - bracket size number for the classic mode label
 */
export default function ModeSelector({ selected, onSelect, bracketSize }) {
  return (
    <div className="mode-select">
      <div
        className={`mode-btn${selected === 'classic' ? ' active' : ''}`}
        onClick={() => onSelect('classic')}
      >
        <span className="mode-ico">🏆</span>
        <span className="mode-title">经典 {bracketSize} 强</span>
        <span className="mode-desc">
          单败淘汰<br />种子排位 · {bracketSize - 1} 场
        </span>
      </div>
      <div
        className={`mode-btn wc-btn${selected === 'wc' ? ' active' : ''}`}
        onClick={() => onSelect('wc')}
      >
        <span className="mode-ico">⚽</span>
        <span className="mode-title">世界杯模式</span>
        <span className="mode-desc">
          12 组循环赛 + 捞回8个<br />32强淘汰赛 · ~103 场
        </span>
      </div>
    </div>
  );
}
