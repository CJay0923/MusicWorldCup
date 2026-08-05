import React from 'react';

/** 品牌标题图路径（public/brand-mark.png，真·透明背景 PNG，随构建复制进 dist/） */
const BRAND_MARK_URL = './brand-mark.png';

/**
 * SONG WORLD CUP 品牌标题图（AI 生成的 Y2K 海报风 + 真透明背景）。
 * 深底 + 白色 SONG WORLD + 粉色大 CUP + 立体金皇冠 + 频谱装饰，背景已抠为透明。
 * @param {string} className - 额外样式类
 * @param {number} [width] - 像素宽度（默认按容器自适应）
 */
export default function BrandMark({ className = '', width }) {
  return (
    <img
      src={BRAND_MARK_URL}
      alt="SONG WORLD CUP"
      width={width}
      role="img"
      className={className || 'w-[min(420px,88vw)]'}
      style={{ height: 'auto' }}
    />
  );
}
