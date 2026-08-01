import React from 'react';
import { clsx } from 'clsx';

/**
 * Mode selection (classic / wc / custom / cross-battle / ranking).
 * 现代简洁风格：固定宽度、清晰选中状态、无鎏金光效
 */
export default function ModeSelector({ selected, onSelect, bracketSize }) {
  const modeBtnBase = [
    'relative flex w-[180px] cursor-pointer flex-col items-center gap-2.5',
    'rounded-xl border px-6 py-5 text-center',
    'transition-all duration-250 ease-out',
    'hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.35)]',
    'active:translate-y-0 active:scale-[0.98]',
  ];

  const item = (mode, ico, title, desc, themeColor) => {
    const isSelected = selected === mode;
    const baseCls = clsx(
      ...modeBtnBase,
      // 选中状态：清晰的边框 + 背景色，无光效
      isSelected
        ? `border-${themeColor} bg-${themeColor}/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.3)]`
        : 'border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06]',
    );
    return (
      <div className={baseCls} onClick={() => onSelect(mode)}>
        <span className="text-4xl">{ico}</span>
        <span
          className={clsx(
            'font-display text-[15px] font-bold',
            isSelected ? `text-${themeColor}` : 'text-white/9',
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-white/45">
          {desc}
        </span>
        {/* 选中指示器 */}
        {isSelected && (
          <div
            className={clsx(
              'absolute -bottom-[9px] left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full',
              `bg-${themeColor}`,
            )}
          />
        )}
      </div>
    );
  };

  return (
    <div className="mb-6 flex flex-wrap justify-center gap-4">
      {item(
        'classic',
        '🏆',
        `经典 ${bracketSize} 强`,
        '单败淘汰 · 二选一',
        'accent',
      )}
      {item(
        'wc',
        '⚽',
        '世界杯模式',
        '小组赛 + 淘汰赛',
        'good',
      )}
      {item(
        'custom',
        '✏️',
        '自选模式',
        '自定义歌曲 · 随心对战',
        'accent2',
      )}
      {item(
        'cross-battle',
        '⚔️',
        '多歌手混战',
        '跨歌手对决 · 公平分配',
        'warning',
      )}
      {item(
        'ranking',
        '📊',
        '夯到拉排名',
        '分层排名 · 曲线递增',
        'info',
      )}
    </div>
  );
}
