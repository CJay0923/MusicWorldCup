import React from 'react';

/**
 * SONG WORLD CUP 艺术字标（潮流大字报风，用户指定版）。
 * 结构：居中的 SONG WORLD 小字 + 居中的 emoji 皇冠（歪歪的）+ 居中的超大 CUP。
 * emoji 皇冠为用户明确指定，非模型默认选择。
 * @param {string} className - 额外样式类
 * @param {number} [width] - 像素宽度（默认按容器自适应）
 */
export default function BrandMark({ className = '', width }) {
  const C = 'var(--accent)';
  return (
    <svg
      viewBox="0 0 420 150"
      width={width}
      role="img"
      aria-label="SONG WORLD CUP"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={width == null ? { width: 'min(420px, 88vw)', height: 'auto' } : undefined}
    >
      {/* 上行小字 SONG WORLD（居中，Frizon 几何展示无衬线） */}
      <text
        x="210"
        y="44"
        fill="#f4f4f6"
        textAnchor="middle"
        fontFamily="'Frizon', Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
        fontSize="30"
        fontWeight="400"
        letterSpacing="4"
      >
        SONG WORLD
      </text>

      {/* emoji 皇冠：用户指定，歪放在 CUP 的 P 字母上方，右倾斜 45° */}
      <text
        x="308"
        y="52"
        fontSize="40"
        textAnchor="middle"
        transform="rotate(45 308 52)"
      >
        👑
      </text>

      {/* 下行超大 CUP（居中，Frizon 几何展示无衬线） */}
      <text
        x="210"
        y="132"
        fill={C}
        textAnchor="middle"
        fontFamily="'Frizon', Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
        fontSize="100"
        fontWeight="400"
        letterSpacing="-1"
      >
        CUP
      </text>
    </svg>
  );
}
