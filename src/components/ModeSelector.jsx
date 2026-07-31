import React from 'react';
import { clsx } from 'clsx';

const modeBtnBase = clsx(
  'relative flex min-w-[200px] cursor-pointer flex-col items-center gap-2 overflow-hidden',
  'rounded-lg border px-8 py-6 text-center backdrop-blur-[6px]',
  'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'hover:-translate-y-1 hover:bg-white/7 hover:shadow-[0_16px_40px_rgba(0,0,0,0.3)]',
  'active:translate-y-0 active:scale-[0.97]',
);

/**
 * Mode selection (classic / wc / custom / cross-battle / ranking).
 */
export default function ModeSelector({ selected, onSelect, bracketSize }) {
  const item = (mode, ico, title, desc, extraHover) => (
    <div
      className={clsx(
        modeBtnBase,
        extraHover,
        selected === mode
          ? 'border-accent bg-gradient-to-br from-accent/14 to-accent2/8 shadow-[0_8px_30px_rgba(255,210,74,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]'
          : 'border-white/10 bg-white/3',
      )}
      onClick={() => onSelect(mode)}
    >
      <span className="text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">{ico}</span>
      <span className="font-display text-base font-extrabold text-ink">{title}</span>
      <span className="text-[11px] leading-relaxed text-muted">{desc}</span>
    </div>
  );

  return (
    <div className="mb-2.5 flex flex-wrap justify-center gap-4">
      {item(
        'classic',
        '🏆',
        `经典 ${bracketSize} 强`,
        <>
          单败淘汰
          <br />
          种子排位 · {bracketSize - 1} 场
        </>,
      )}
      {item(
        'wc',
        '⚽',
        '世界杯模式',
        <>
          12 组循环赛 + 捞回8个
          <br />
          32强淘汰赛 · ~103 场
        </>,
        'hover:border-good hover:shadow-[0_16px_40px_rgba(55,226,165,0.2),0_0_0_1px_rgba(55,226,165,0.1)]',
      )}
      {item(
        'custom',
        '✏️',
        '自选模式',
        <>
          自定义歌曲
          <br />
          单败淘汰 · 随心对战
        </>,
        'hover:border-accent2 hover:shadow-[0_16px_40px_rgba(255,92,138,0.2),0_0_0_1px_rgba(255,92,138,0.1)]',
      )}
      {item(
        'cross-battle',
        '⚔️',
        '多歌手混战',
        <>
          选多位歌手
          <br />
          跨歌手对决 · 公平分配
        </>,
      )}
      {item(
        'ranking',
        '📊',
        '夯到拉排名',
        <>
          歌手/歌曲/专辑
          <br />
          分层排名 · 曲线递增
        </>,
      )}
    </div>
  );
}
