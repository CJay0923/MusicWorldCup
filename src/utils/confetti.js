// Confetti animation utility — powered by canvas-confetti
// Returns a cleanup function

import confetti from 'canvas-confetti';

const COLORS = ['#ffd24a', '#ff5c8a', '#37e2a5', '#ff8a3d', '#ffffff', '#7aa2ff'];

/**
 * 在指定 canvas 上发射三波彩纸庆祝动画。
 * @param {HTMLCanvasElement} canvas - 已在 DOM 中的 canvas 元素
 * @returns {() => void} 清理函数，停止动画并清空 canvas
 */
export function launchConfetti(canvas) {
  if (!canvas) return () => {};

  // 绑定到现有 canvas，自动处理 resize
  const fire = confetti.create(canvas, { resize: true });

  const burst = (count, spread) => {
    // 左右两侧炮筒 + 中央爆发，营造全方位庆祝效果
    fire({
      particleCount: Math.round(count * 0.4),
      spread,
      origin: { x: 0, y: 0.7 },
      colors: COLORS,
      startVelocity: 45,
      gravity: 0.8,
      scalar: 0.9,
      shapes: ['square', 'circle'],
    });
    fire({
      particleCount: Math.round(count * 0.4),
      spread,
      origin: { x: 1, y: 0.7 },
      colors: COLORS,
      startVelocity: 45,
      gravity: 0.8,
      scalar: 0.9,
      shapes: ['square', 'circle'],
    });
    fire({
      particleCount: Math.round(count * 0.2),
      spread: spread * 1.2,
      origin: { x: 0.5, y: 0.5 },
      colors: COLORS,
      startVelocity: 35,
      gravity: 0.8,
      scalar: 0.9,
      shapes: ['square', 'circle'],
    });
  };

  // 三波彩纸：160 → 112 → 80
  burst(160, 70);
  const t1 = setTimeout(() => burst(112, 60), 650);
  const t2 = setTimeout(() => burst(80, 50), 1300);

  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    fire.reset();
  };
}
