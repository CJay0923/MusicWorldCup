import React from 'react';
import { clsx } from 'clsx';

/**
 * Mode selection (classic / wc / custom / cross-battle / ranking).
 * @param {'classic'|'wc'|'custom'|'cross-battle'|'ranking'} selected - currently selected mode
 * @param {(mode: string) => void} onSelect - callback when a mode is selected
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
      <div
        className={clsx('mode-btn', 'cross-btn', { active: selected === 'cross-battle' })}
        onClick={() => onSelect('cross-battle')}
      >
        <span className="mode-ico">⚔️</span>
        <span className="mode-title">多歌手混战</span>
        <span className="mode-desc">
          选多位歌手
          <br />
          跨歌手对决 · 公平分配
        </span>
      </div>
      <div
        className={clsx('mode-btn', 'rank-btn', { active: selected === 'ranking' })}
        onClick={() => onSelect('ranking')}
      >
        <span className="mode-ico">📊</span>
        <span className="mode-title">夯到拉排名</span>
        <span className="mode-desc">
          歌手/歌曲/专辑
          <br />
          分层排名 · 曲线递增
        </span>
      </div>
    </div>
  );
}
