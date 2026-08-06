import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { ACHIEVEMENTS } from '../utils/playstyle.js';

/**
 * 成就解锁 Toast 通知。
 * 当 newAchievements 非空时逐个展示，4 秒后自动消失。
 *
 * @param {string[]} newAchievements - 新解锁的成就 key 数组
 * @param {() => void} onDismiss - 关闭回调
 */
export default function AchievementToast({ newAchievements, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  const current = newAchievements[currentIdx];
  const ach = current ? ACHIEVEMENTS[current] : null;

  useEffect(() => {
    if (!newAchievements || newAchievements.length === 0) {
      setVisible(false);
      return;
    }
    setCurrentIdx(0);
    setVisible(true);

    const timer = setTimeout(() => {
      if (currentIdx < newAchievements.length - 1) {
        setCurrentIdx((i) => i + 1);
      } else {
        setVisible(false);
        onDismiss?.();
      }
    }, 4000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAchievements, currentIdx]);

  if (!visible || !ach) return null;

  return (
    <div
      className={clsx(
        'fixed left-1/2 top-[80px] z-[--z-overlay] -translate-x-1/2',
        'animate-[achToastIn_0.5s_cubic-bezier(0.22,1.4,0.36,1)]',
      )}
      role="alert"
      aria-live="polite"
    >
      <div
        className={clsx(
          'flex items-center gap-3 rounded-2xl border-2 border-accent/50',
          'bg-bg2/95 px-5 py-3.5 shadow-[0_8px_32px_rgba(167,139,250,0.18),0_0_60px_rgba(139,92,246,0.08)]',
          'backdrop-blur-[12px]',
        )}
      >
        {/* 成就图标 */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-2xl">
          {ach.icon}
        </div>
        {/* 文字 */}
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-[2px] text-accent">
            🏅 成就解锁
          </span>
          <span className="font-display text-[15px] font-black text-ink">
            {ach.title}
          </span>
          <span className="text-[11.5px] text-muted">{ach.desc}</span>
        </div>
      </div>
    </div>
  );
}
