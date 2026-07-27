// Confetti animation utility — powered by canvas-confetti
// 提供三种效果：
//   1) 初始三波爆发（左右炮筒 + 中央）
//   2) 持续氛围彩雨（慢速、稀疏，营造颁奖典礼感）
//   3) 交互追加（点击页面任意位置触发小爆发）
// 返回 cleanup 函数：停止所有动画并重置 canvas

import confetti from 'canvas-confetti';

// 主题色：金色为主，搭配粉色、绿色、橙色、白色
const COLORS = ['#ffd24a', '#ff5c8a', '#37e2a5', '#ff8a3d', '#ffffff', '#7aa2ff'];

// 形状：方、圆、星，丰富视觉层次
const SHAPES = ['square', 'circle', 'star'];

/**
 * 在指定 canvas 上启动彩带庆祝动画。
 * @param {HTMLCanvasElement} canvas - 已在 DOM 中的 canvas 元素
 * @returns {() => void} 清理函数，停止动画并清空 canvas
 */
export function launchConfetti(canvas) {
  if (!canvas) return () => {};

  // 绑定到现有 canvas，自动处理 resize
  const fire = confetti.create(canvas, {
    resize: true,
    useWorker: false, // 主线程，避免 worker 重置时画面残留
  });

  // ---------- 单波爆发 ----------
  const burst = (count, spread, opts = {}) => {
    const base = {
      particleCount: count,
      spread,
      colors: COLORS,
      shapes: SHAPES,
      startVelocity: 45,
      gravity: 0.85,
      scalar: 0.95,
      ticks: 220,
      ...opts,
    };
    // 左炮筒
    fire({
      ...base,
      particleCount: Math.round(count * 0.4),
      origin: { x: 0, y: 0.75 },
      angle: 60,
    });
    // 右炮筒
    fire({
      ...base,
      particleCount: Math.round(count * 0.4),
      origin: { x: 1, y: 0.75 },
      angle: 120,
    });
    // 中央爆发
    fire({
      ...base,
      particleCount: Math.round(count * 0.2),
      spread: spread * 1.3,
      origin: { x: 0.5, y: 0.55 },
      startVelocity: 38,
    });
  };

  // ---------- 持续氛围彩雨 ----------
  // 每隔一段时间从顶部随机位置释放少量低速彩纸，营造颁奖典礼氛围
  const ambient = () => {
    fire({
      particleCount: 4,
      spread: 70,
      startVelocity: 18,
      gravity: 0.5,
      decay: 0.92,
      ticks: 320,
      scalar: 0.7,
      drift: 0.4,
      colors: COLORS,
      shapes: SHAPES,
      origin: {
        x: Math.random(),
        y: -0.05,
      },
      angle: 90,
    });
  };

  // ---------- 交互追加 ----------
  // 点击页面任意位置触发小爆发；坐标基于点击位置
  const onClick = (e) => {
    // 忽略对按钮/链接的点击，避免干扰交互
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'button' || tag === 'a' || tag === 'input') return;
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    fire({
      particleCount: 28,
      spread: 55,
      startVelocity: 32,
      gravity: 0.9,
      scalar: 0.85,
      ticks: 180,
      colors: COLORS,
      shapes: SHAPES,
      origin: { x, y },
    });
  };

  // ---------- 启动序列 ----------
  // 1) 三波初始爆发：160 → 120 → 90
  burst(160, 75);
  const t1 = setTimeout(() => burst(120, 65), 600);
  const t2 = setTimeout(() => burst(90, 55), 1250);

  // 2) 持续氛围彩雨：每 600ms 释放一批，持续到 cleanup
  const ambientTimer = setInterval(ambient, 600);

  // 3) 交互追加：监听整个文档的点击
  document.addEventListener('click', onClick, { passive: true });

  // ---------- 清理 ----------
  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    clearInterval(ambientTimer);
    document.removeEventListener('click', onClick);
    fire.reset();
  };
}
