// Confetti animation utility
// Returns a cleanup function

export function launchConfetti(canvas) {
  if (!canvas) return () => {};
  const cx = canvas.getContext('2d');
  let parts = [];
  let raf;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const colors = ['#ffd24a', '#ff5c8a', '#37e2a5', '#ff8a3d', '#ffffff', '#7aa2ff'];

  function spawnWave(scale) {
    const n = Math.round(160 * scale);
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * canvas.width,
        y: -30 + Math.random() * canvas.height * 0.85,
        r: 4 + Math.random() * 8,
        c: colors[(Math.random() * colors.length) | 0],
        vx: -2.5 + Math.random() * 5,
        vy: 1.2 + Math.random() * 3,
        rot: Math.random() * Math.PI,
        vr: -0.25 + Math.random() * 0.5,
        shape: Math.random() < 0.5 ? 'rect' : 'circle'
      });
    }
  }

  spawnWave(1);
  setTimeout(() => spawnWave(0.7), 650);
  setTimeout(() => spawnWave(0.5), 1300);

  function tick() {
    cx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vy += 0.04;
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.rot);
      cx.fillStyle = p.c;
      if (p.shape === 'rect') {
        cx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      } else {
        cx.beginPath();
        cx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
        cx.fill();
      }
      cx.restore();
    });
    parts = parts.filter(p => p.y < canvas.height + 30);
    if (parts.length) {
      raf = requestAnimationFrame(tick);
    } else {
      cx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  tick();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    cx.clearRect(0, 0, canvas.width, canvas.height);
  };
}
