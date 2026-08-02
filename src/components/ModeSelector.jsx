import React from 'react';
import { clsx } from 'clsx';

/**
 * Mode selection (classic / wc / custom / cross-battle / ranking).
 * 现代简洁风格：固定宽度、清晰选中状态、无鎏金光效
 */

// 查表对象：全字面量类名，Tailwind JIT 能正确生成
const MODE_COLORS = {
  classic: {
    selected: 'border-accent bg-accent/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    text: 'text-accent',
    dot: 'bg-accent',
  },
  wc: {
    selected: 'border-good bg-good/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    text: 'text-good',
    dot: 'bg-good',
  },
  custom: {
    selected: 'border-accent2 bg-accent2/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    text: 'text-accent2',
    dot: 'bg-accent2',
  },
  'cross-battle': {
    selected: 'border-side-right bg-side-right/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    text: 'text-side-right',
    dot: 'bg-side-right',
  },
  ranking: {
    selected: 'border-accent2 bg-accent2/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    text: 'text-accent2',
    dot: 'bg-accent2',
  },
};

export default function ModeSelector({ selected, onSelect, bracketSize }) {
  const modeBtnBase = [
    'relative flex w-[150px] cursor-pointer flex-col items-center gap-2.5',
    'rounded-xl border px-4 py-5 text-center',
    'transition-all duration-250 ease-out',
    'hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]',
    'active:translate-y-0 active:scale-[0.98]',
    'sm:w-[170px] sm:px-6',
  ];

  const item = (mode, ico, title, desc) => {
    const isSelected = selected === mode;
    const colors = MODE_COLORS[mode] || MODE_COLORS.classic;
    const baseCls = clsx(
      ...modeBtnBase,
      isSelected
        ? colors.selected
        : 'border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06]',
    );
    return (
      <div className={baseCls} onClick={() => onSelect(mode)}>
        <span className="text-4xl">{ico}</span>
        <span
          className={clsx(
            'font-display text-[15px] font-bold',
            isSelected ? colors.text : 'text-white/55',
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">
          {desc}
        </span>
        {/* 选中指示器 */}
        {isSelected && (
          <div
            className={clsx(
              'absolute -bottom-[9px] left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full',
              colors.dot,
            )}
          />
        )}
      </div>
    );
  };

  return (
    <div className="mb-6 flex flex-wrap justify-center gap-3 sm:gap-4">
      {item('classic', '🏆', `经典 ${bracketSize} 强`, '单败淘汰 · 二选一')}
      {item('wc', '⚽', '世界杯模式', '小组赛 + 淘汰赛')}
      {item('custom', '✏️', '自选模式', '自定义歌曲 · 随心对战')}
      {item('cross-battle', '⚔️', '多歌手混战', '跨歌手对决 · 公平分配')}
      {item('ranking', '📊', '夯到拉排名', '分层排名 · 曲线递增')}
    </div>
  );
}
