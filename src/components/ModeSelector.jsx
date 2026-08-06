import React from 'react';
import { clsx } from 'clsx';

/**
 * Mode selection (classic / wc / custom / cross-battle / ranking).
 * 现代简洁风格：固定宽度、清晰选中状态、无鎏金光效
 */

// 查表对象：全字面量类名，Tailwind JIT 能正确生成
const MODE_COLORS = {
  classic: {
    selected: 'border-accent bg-accent/[0.15] shadow-[0_0_0_1px_rgba(167,139,250,0.3),0_4px_16px_rgba(124,58,237,0.25)]',
    text: 'text-accent',
    dot: 'bg-accent',
    stroke: 'stroke-accent',
  },
  wc: {
    selected: 'border-good bg-good/[0.15] shadow-[0_0_0_1px_rgba(6,167,125,0.3),0_4px_16px_rgba(6,167,125,0.25)]',
    text: 'text-good',
    dot: 'bg-good',
    stroke: 'stroke-good',
  },
  custom: {
    selected: 'border-accent2 bg-accent2/[0.15] shadow-[0_0_0_1px_rgba(124,58,237,0.3),0_4px_16px_rgba(124,58,237,0.25)]',
    text: 'text-accent2',
    dot: 'bg-accent2',
    stroke: 'stroke-accent2',
  },
  'cross-battle': {
    selected: 'border-side-right bg-side-right/[0.15] shadow-[0_0_0_1px_rgba(255,182,39,0.3),0_4px_16px_rgba(255,182,39,0.25)]',
    text: 'text-side-right',
    dot: 'bg-side-right',
    stroke: 'stroke-side-right',
  },
  ranking: {
    selected: 'border-accent2 bg-accent2/[0.15] shadow-[0_0_0_1px_rgba(124,58,237,0.3),0_4px_16px_rgba(124,58,237,0.25)]',
    text: 'text-accent2',
    dot: 'bg-accent2',
    stroke: 'stroke-accent2',
  },
};

// ---- 极简线性 SVG 图标（24×24, stroke-based, currentColor） ----

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: 1.8,
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

const MODE_SUBS = {
  classic: '单败淘汰 · 二选一',
  wc: '小组 + 淘汰赛',
  custom: '自选歌曲 · 随心对战',
  'cross-battle': '跨歌手 · 公平分配',
  ranking: '分层 · 从夯到拉',
};

export default function ModeSelector({ selected, onSelect, bracketSize }) {
  const modes = [
    { id: 'classic', title: `经典 ${bracketSize} 强` },
    { id: 'wc', title: '世界杯模式' },
    { id: 'custom', title: '自选模式' },
    { id: 'cross-battle', title: '多歌手混战' },
    { id: 'ranking', title: '夯到拉排名' },
  ];

  return (
    <div className="mx-auto mb-6 w-full max-w-[1100px]">
      <div className="mode-grid grid w-full grid-cols-2 gap-1 rounded-xl border border-white/[0.10] bg-black/[0.35] p-1.5 sm:grid-cols-3 md:grid-cols-5 md:gap-2 md:p-2">
        {modes.map(({ id, title }) => {
          const isSelected = selected === id;
          const colors = MODE_COLORS[id] || MODE_COLORS.classic;
          const Icon = MODE_ICONS[id] || IconClassic;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={clsx(
                'group relative flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2.5 py-2.5 text-left',
                'transition-all duration-200 ease-out',
                'md:gap-3 md:px-4 md:py-3',
                isSelected
                  ? colors.selected
                  : 'hover:bg-white/[0.05] hover:border-white/[0.08]',
              )}
            >
              <Icon
                className={clsx(
                  'shrink-0 transition-colors duration-200',
                  isSelected ? colors.stroke : 'stroke-white/35 group-hover:stroke-white/55',
                )}
              />
              <div className="flex min-w-0 flex-col">
                <span
                  className={clsx(
                    'truncate text-[13px] font-extrabold leading-tight md:text-[15px]',
                    isSelected ? colors.text : 'text-white/75 group-hover:text-white/90',
                  )}
                >
                  {title}
                </span>
                <span className="hidden truncate text-[11px] font-medium text-white/35 sm:block">
                  {MODE_SUBS[id]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
