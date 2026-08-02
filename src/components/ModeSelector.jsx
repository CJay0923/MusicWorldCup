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
    stroke: 'stroke-accent',
  },
  wc: {
    selected: 'border-good bg-good/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    text: 'text-good',
    dot: 'bg-good',
    stroke: 'stroke-good',
  },
  custom: {
    selected: 'border-accent2 bg-accent2/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    text: 'text-accent2',
    dot: 'bg-accent2',
    stroke: 'stroke-accent2',
  },
  'cross-battle': {
    selected: 'border-side-right bg-side-right/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    text: 'text-side-right',
    dot: 'bg-side-right',
    stroke: 'stroke-side-right',
  },
  ranking: {
    selected: 'border-accent2 bg-accent2/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    text: 'text-accent2',
    dot: 'bg-accent2',
    stroke: 'stroke-accent2',
  },
};

// ---- 极简线性 SVG 图标（24×24, stroke-based, currentColor） ----

const ICON_PROPS = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// 经典模式：淘汰赛对阵树（两线汇合）
const IconClassic = ({ className }) => (
  <svg {...ICON_PROPS} className={className}>
    <path d="M4 4v6a4 4 0 0 0 4 4h4" />
    <path d="M20 4v6a4 4 0 0 1-4 4h-4" />
    <path d="M12 14v6" />
    <path d="M9 20h6" />
  </svg>
);

// 世界杯模式：五边形（足球截面抽象）
const IconWorldCup = ({ className }) => (
  <svg {...ICON_PROPS} className={className}>
    <polygon points="12,3 21,9 18,20 6,20 3,9" />
    <path d="M12 8v4l3 2" />
  </svg>
);

// 自选模式：铅笔尖（编辑/自定义）
const IconCustom = ({ className }) => (
  <svg {...ICON_PROPS} className={className}>
    <path d="M14 4l6 6-9 9H5v-6z" />
    <path d="M14 4l6 6" />
  </svg>
);

// 多歌手混战：交叉双刃（对决）
const IconCrossBattle = ({ className }) => (
  <svg {...ICON_PROPS} className={className}>
    <path d="M5 19L19 5" />
    <path d="M5 5l14 14" />
    <circle cx="5" cy="5" r="2.5" />
    <circle cx="19" cy="5" r="2.5" />
  </svg>
);

// 夯到拉排名：递增条形图（分层排名）
const IconRanking = ({ className }) => (
  <svg {...ICON_PROPS} className={className}>
    <rect x="3" y="14" width="5" height="6" rx="1" />
    <rect x="9.5" y="9" width="5" height="11" rx="1" />
    <rect x="16" y="4" width="5" height="16" rx="1" />
  </svg>
);

const MODE_ICONS = {
  classic: IconClassic,
  wc: IconWorldCup,
  custom: IconCustom,
  'cross-battle': IconCrossBattle,
  ranking: IconRanking,
};

export default function ModeSelector({ selected, onSelect, bracketSize }) {
  const modeBtnBase = [
    'relative flex w-[150px] cursor-pointer flex-col items-center gap-2',
    'rounded-xl border px-4 py-5 text-center',
    'transition-all duration-250 ease-out',
    'hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]',
    'active:translate-y-0 active:scale-[0.98]',
    'sm:w-[170px] sm:px-6',
  ];

  const item = (mode, title, desc) => {
    const isSelected = selected === mode;
    const colors = MODE_COLORS[mode] || MODE_COLORS.classic;
    const Icon = MODE_ICONS[mode] || IconClassic;
    const baseCls = clsx(
      ...modeBtnBase,
      isSelected
        ? colors.selected
        : 'border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06]',
    );
    return (
      <div className={baseCls} onClick={() => onSelect(mode)}>
        {/* SVG 线性图标 — 选中时品牌色，未选时灰色 */}
        <Icon
          className={clsx(
            'transition-colors duration-250',
            isSelected ? colors.stroke : 'stroke-white/30',
          )}
        />
        <span
          className={clsx(
            'text-[15px] font-bold',
            isSelected ? colors.text : 'text-white/55',
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
          {desc}
        </span>
        {/* 选中指示器 */}
        {isSelected && (
          <div
            className={clsx(
              'absolute -bottom-2 left-1/2 h-0.75 w-8 -translate-x-1/2 rounded-full',
              colors.dot,
            )}
          />
        )}
      </div>
    );
  };

  return (
    <div className="mb-6 flex flex-wrap justify-center gap-3 sm:gap-4">
      {item('classic', `经典 ${bracketSize} 强`, '单败淘汰 · 二选一')}
      {item('wc', '世界杯模式', '小组赛 + 淘汰赛')}
      {item('custom', '自选模式', '自定义歌曲 · 随心对战')}
      {item('cross-battle', '多歌手混战', '跨歌手对决 · 公平分配')}
      {item('ranking', '夯到拉排名', '分层排名 · 曲线递增')}
    </div>
  );
}
