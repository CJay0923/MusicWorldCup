// ChampionShare.jsx
// 冠军晋级之路分享图组件
//
// 在冠军展示页渲染一个"分享晋级之路"按钮，点击后用 Canvas 绘制
// 左右半区镜像对阵树，冠军路线用品牌色(金色 #ffd24a)高亮，
// 支持预览与下载为 JPEG 图片。
//
// props:
//   champion    {name,id,pic,side,seed,...}  最终冠军 entrant
//   history     [{roundName,winner,loser}]   冠军之路历史(可选，用于兼容)
//   rounds      二维数组: rounds[0]=首轮参赛者, rounds[last]=[冠军]
//   singerName  歌手名(如"孙燕姿")
//   bracketSize 128 / 64 / 32 ...

import React, { useRef, useState } from 'react';

// ---------------- 常量 ----------------
const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Hiragino Sans GB",sans-serif';
const GOLD = '#ffd24a';
const IMG_TIMEOUT = 8000;

// ---------------- 工具函数 ----------------

// 将 rounds 二维数组转换为 matches[r] = [{a,b,winner}] 格式
function buildMatches(rounds) {
  const matches = [];
  for (let r = 0; r < rounds.length - 1; r++) {
    const arr = [];
    for (let m = 0; m < rounds[r].length; m += 2) {
      const a = rounds[r][m];
      const b = rounds[r][m + 1];
      const winner = rounds[r + 1] ? rounds[r + 1][m / 2] : null;
      arr.push({ a, b, winner });
    }
    matches.push(arr);
  }
  return matches;
}

// 圆角矩形路径
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// 截断文本以适配宽度
function fitText(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return (lo > 0 ? text.slice(0, lo) : '') + '…';
}

// 加载单张封面图，crossOrigin 防止画布污染；失败/超时返回 null
function loadImage(url, timeout = IMG_TIMEOUT) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      resolve(val);
    };
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = url;
    setTimeout(() => finish(null), timeout);
  });
}

// 占位封面：渐变 + 音符 ♪
function drawPlaceholder(ctx, x, y, size) {
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, '#2a2a48');
  g.addColorStop(1, '#141422');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = 'rgba(255,210,74,0.55)';
  ctx.font = `${Math.round(size * 0.6)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♪', x + size / 2, y + size / 2);
}

// 绘制封面(带圆角裁剪 + 边框)
function drawCover(ctx, x, y, size, img, isChampPath) {
  ctx.save();
  roundRect(ctx, x, y, size, size, Math.max(2, size * 0.18));
  ctx.clip();
  if (img && img.complete && img.naturalWidth > 0) {
    try {
      ctx.drawImage(img, x, y, size, size);
    } catch (e) {
      drawPlaceholder(ctx, x, y, size);
    }
  } else {
    drawPlaceholder(ctx, x, y, size);
  }
  ctx.restore();
  ctx.lineWidth = isChampPath ? 1.5 : 1;
  ctx.strokeStyle = isChampPath ? GOLD : 'rgba(255,255,255,0.16)';
  roundRect(ctx, x, y, size, size, Math.max(2, size * 0.18));
  ctx.stroke();
}

// 绘制单张对阵卡片
function drawCard(ctx, opts) {
  const { x, y, w, h, entrant, side, isChampPath, isWinner, imgMap, coverSize } = opts;
  if (!entrant) return;

  // 背景
  roundRect(ctx, x, y, w, h, 5);
  if (isChampPath) {
    ctx.fillStyle = 'rgba(255,210,74,0.18)';
  } else if (isWinner) {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.028)';
  }
  ctx.fill();
  ctx.lineWidth = isChampPath ? 1.6 : 1;
  ctx.strokeStyle = isChampPath ? GOLD : 'rgba(255,255,255,0.10)';
  ctx.stroke();

  // 封面
  const cs = coverSize;
  const cy = y + (h - cs) / 2;
  const cx = side === 'L' ? x + 3 : x + w - cs - 3;
  const img = entrant.pic ? imgMap[entrant.pic] : null;
  drawCover(ctx, cx, cy, cs, img, isChampPath);

  // 歌名
  const pad = 6;
  const nameX = side === 'L' ? cx + cs + pad : cx - pad;
  const nameMaxW = w - cs - pad * 2 - 2;
  const fontSize = Math.max(10, Math.min(13, h - 8));
  ctx.fillStyle = isChampPath ? '#ffffff' : isWinner ? '#f1f2fb' : 'rgba(200,206,236,0.55)';
  ctx.font = `${isChampPath ? 700 : 600} ${fontSize}px ${FONT}`;
  ctx.textAlign = side === 'L' ? 'left' : 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitText(ctx, entrant.name, nameMaxW), nameX, y + h / 2);
}

// 绘制一场比赛的连接线(子->父)
// childEdgeX: 子卡片朝向父侧的边缘 x；parentEdgeX: 父卡片朝向子侧的边缘 x
function drawConnector(ctx, childEdgeAX, ya, childEdgeBX, yb, jointX, parentEdgeX, yw, isChampPath) {
  ctx.save();
  ctx.strokeStyle = isChampPath ? GOLD : 'rgba(255,255,255,0.16)';
  ctx.lineWidth = isChampPath ? 2.4 : 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(childEdgeAX, ya);
  ctx.lineTo(jointX, ya);
  ctx.moveTo(childEdgeBX, yb);
  ctx.lineTo(jointX, yb);
  ctx.moveTo(jointX, ya);
  ctx.lineTo(jointX, yb);
  ctx.moveTo(jointX, yw);
  ctx.lineTo(parentEdgeX, yw);
  ctx.stroke();
  ctx.restore();
}

// ---------------- 主渲染函数 ----------------
async function renderShareCanvas({ champion, rounds, singerName, bracketSize }) {
  const bs = bracketSize || (rounds && rounds[0] ? rounds[0].length : 128);
  const numRounds = Math.log2(bs); // 7 for 128, 6 for 64, 5 for 32
  const matches = buildMatches(rounds);

  // ---- 布局常量 ----
  const W = 1080;
  const margin = 22;
  const headerH = 96;
  const footerH = 64;
  const halfCount = bs / 2; // 每半区首轮参赛者数
  const rowH = bs >= 128 ? 34 : bs >= 64 ? 52 : 64;
  const sideSpan = halfCount * rowH;
  const H = headerH + sideSpan + footerH;
  const centerX = W / 2;
  const centerY = headerH + sideSpan / 2;

  const champCover = 168;
  const champHalfW = 96; // 冠军块半宽(留出与半区的间距)
  const sideCols = numRounds; // 每半区列数 0..numRounds-1 (最后一列为决赛选手)
  const sideWidth = centerX - champHalfW - margin;
  const colWidth = sideWidth / sideCols;
  const colGap = 6;
  const cardW = colWidth - colGap;
  const cardH = rowH - 4;

  const leftColX = (c) => margin + c * colWidth;
  const rightColX = (c) => W - margin - (c + 1) * colWidth;
  // 第 r 轮第 j 个(半区内索引)参赛者的 y 坐标
  const yOf = (r, j) => headerH + (j + 0.5) * rowH * Math.pow(2, r);
  const halfCountR = (r) => bs >> (r + 1); // 第 r 轮每半区参赛者数

  const coverSize = (r) => Math.min(cardH - 4, Math.max(16, Math.round(colWidth * 0.42 + r * 1.5)));

  // ---- 加载封面图 ----
  const imgMap = {};
  const urlSet = new Set();
  if (champion && champion.pic) urlSet.add(champion.pic);
  for (let r = 0; r < rounds.length; r++) {
    for (const e of rounds[r] || []) {
      if (e && e.pic) urlSet.add(e.pic);
    }
  }
  const urls = [...urlSet];
  await Promise.race([
    Promise.all(urls.map((u) => loadImage(u).then((img) => { if (img) imgMap[u] = img; }))),
    new Promise((r) => setTimeout(r, IMG_TIMEOUT)),
  ]);

  // ---- 画布 ----
  const canvas = document.createElement('canvas');
  const dpr = 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // ---- 背景 ----
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0b13');
  bg.addColorStop(0.45, '#12122a');
  bg.addColorStop(1, '#0b0b13');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(360, sideSpan * 0.35));
  glow.addColorStop(0, 'rgba(255,210,74,0.10)');
  glow.addColorStop(1, 'rgba(255,210,74,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // 细网格点(轻微)
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let yy = 0; yy < H; yy += 26) {
    for (let xx = 0; xx < W; xx += 26) {
      ctx.fillRect(xx, yy, 1, 1);
    }
  }

  // ---- 标题 ----
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = GOLD;
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText(`${singerName || ''} · 歌曲世界杯`, centerX, 42);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText('CHAMPION PATH · 冠军晋级之路', centerX, 70);

  // 左右半区标签
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('LEFT · 左半区', margin, headerH - 12);
  ctx.textAlign = 'right';
  ctx.fillText('右半区 · RIGHT', W - margin, headerH - 12);

  const champId = champion ? champion.id : null;

  // ---- 先画连接线(底层) ----
  for (let r = 0; r < numRounds - 1; r++) {
    const ms = matches[r];
    const half = Math.floor(ms.length / 2); // 每半区该轮比赛数

    // 左半区
    for (let m = 0; m < half; m++) {
      const mk = ms[m];
      const ja = 2 * m;
      const jb = 2 * m + 1;
      const yA = yOf(r, ja);
      const yB = yOf(r, jb);
      const yW = yOf(r + 1, m);
      const childEdge = leftColX(r) + cardW;
      const jointX = childEdge + colGap / 2;
      const parentEdge = leftColX(r + 1);
      const isChampPath = !!(mk.winner && champId != null && mk.winner.id === champId);
      drawConnector(ctx, childEdge, yA, childEdge, yB, jointX, parentEdge, yW, isChampPath);
    }

    // 右半区
    for (let m = half; m < ms.length; m++) {
      const mk = ms[m];
      const local = m - half;
      const ja = 2 * local;
      const jb = 2 * local + 1;
      const yA = yOf(r, ja);
      const yB = yOf(r, jb);
      const yW = yOf(r + 1, local);
      const childEdge = rightColX(r);
      const jointX = childEdge - colGap / 2;
      const parentEdge = rightColX(r + 1) + cardW;
      const isChampPath = !!(mk.winner && champId != null && mk.winner.id === champId);
      drawConnector(ctx, childEdge, yA, childEdge, yB, jointX, parentEdge, yW, isChampPath);
    }
  }

  // ---- 决赛连线(决赛选手 -> 冠军块) ----
  const leftFinalist = rounds[numRounds - 1] ? rounds[numRounds - 1][0] : null;
  const rightFinalist = rounds[numRounds - 1] ? rounds[numRounds - 1][1] : null;
  const champLeft = centerX - champCover / 2;
  const champRight = centerX + champCover / 2;
  ctx.save();
  ctx.lineCap = 'round';
  // 左侧决赛选手 -> 冠军
  if (leftFinalist) {
    const isChamp = leftFinalist.id === champId;
    ctx.strokeStyle = isChamp ? GOLD : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = isChamp ? 2.6 : 1;
    ctx.beginPath();
    ctx.moveTo(leftColX(numRounds - 1) + cardW, centerY);
    ctx.lineTo(champLeft, centerY);
    ctx.stroke();
  }
  // 右侧决赛选手 -> 冠军
  if (rightFinalist) {
    const isChamp = rightFinalist.id === champId;
    ctx.strokeStyle = isChamp ? GOLD : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = isChamp ? 2.6 : 1;
    ctx.beginPath();
    ctx.moveTo(rightColX(numRounds - 1), centerY);
    ctx.lineTo(champRight, centerY);
    ctx.stroke();
  }
  ctx.restore();

  // ---- 画卡片 ----
  for (let r = 0; r < numRounds; r++) {
    const lc = halfCountR(r); // 每半区该轮参赛者数
    const cs = coverSize(r);
    for (let j = 0; j < lc; j++) {
      const eL = rounds[r] ? rounds[r][j] : null;
      const eR = rounds[r] ? rounds[r][lc + j] : null;
      if (eL) {
        const isChamp = eL.id === champId;
        const isWinner = r === numRounds - 1 ? true : isAdvancer(rounds, r, eL);
        drawCard(ctx, {
          x: leftColX(r), y: yOf(r, j) - cardH / 2, w: cardW, h: cardH,
          entrant: eL, side: 'L', isChampPath: isChamp, isWinner, imgMap, coverSize: cs,
        });
      }
      if (eR) {
        const isChamp = eR.id === champId;
        const isWinner = r === numRounds - 1 ? true : isAdvancer(rounds, r, eR);
        drawCard(ctx, {
          x: rightColX(r), y: yOf(r, j) - cardH / 2, w: cardW, h: cardH,
          entrant: eR, side: 'R', isChampPath: isChamp, isWinner, imgMap, coverSize: cs,
        });
      }
    }
  }

  // ---- 中央冠军块 ----
  drawChampionBlock(ctx, {
    centerX, centerY, size: champCover, champion, imgMap, singerName,
  });

  // ---- 底部品牌标识 ----
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText(`🎵 ${singerName || ''}歌曲世界杯 · MUSIC CUP`, centerX, H - footerH / 2 - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.font = `500 10px ${FONT}`;
  ctx.fillText('CHAMPION BRACKET SHARE', centerX, H - footerH / 2 + 14);

  return canvas;
}

// 判断某轮参赛者是否晋级下一轮
function isAdvancer(rounds, r, entrant) {
  if (r >= rounds.length - 1) return false;
  const next = rounds[r + 1] || [];
  return next.some((e) => e && entrant && e.id === entrant.id);
}

// 绘制中央冠军块
function drawChampionBlock(ctx, { centerX, centerY, size, champion, imgMap, singerName }) {
  const half = size / 2;
  const coverY = centerY - half - 6;

  // 外层光晕
  const halo = ctx.createRadialGradient(centerX, coverY + half, 4, centerX, coverY + half, half + 26);
  halo.addColorStop(0, 'rgba(255,210,74,0.30)');
  halo.addColorStop(1, 'rgba(255,210,74,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(centerX, coverY + half, half + 26, 0, Math.PI * 2);
  ctx.fill();

  // 皇冠
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `30px ${FONT}`;
  ctx.fillText('👑', centerX, coverY - 16);

  // 封面
  const img = champion && champion.pic ? imgMap[champion.pic] : null;
  ctx.save();
  roundRect(ctx, centerX - half, coverY, size, size, 16);
  ctx.clip();
  if (img && img.complete && img.naturalWidth > 0) {
    try {
      ctx.drawImage(img, centerX - half, coverY, size, size);
    } catch (e) {
      drawPlaceholder(ctx, centerX - half, coverY, size);
    }
  } else {
    drawPlaceholder(ctx, centerX - half, coverY, size);
  }
  ctx.restore();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = GOLD;
  roundRect(ctx, centerX - half, coverY, size, size, 16);
  ctx.stroke();

  // 歌名
  const nameY = coverY + size + 22;
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 22px ${FONT}`;
  const name = champion ? champion.name : '—';
  ctx.fillText(fitText(ctx, name, 320), centerX, nameY);

  // "🏆 冠军" 标签药丸
  const labelY = nameY + 26;
  const label = '🏆 冠军';
  ctx.font = `700 14px ${FONT}`;
  const labelW = ctx.measureText(label).width + 26;
  const labelH = 24;
  roundRect(ctx, centerX - labelW / 2, labelY - labelH / 2, labelW, labelH, 12);
  ctx.fillStyle = 'rgba(255,210,74,0.18)';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,210,74,0.55)';
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.fillText(label, centerX, labelY);
}

// ---------------- React 组件 ----------------
export default function ChampionShare({ champion, history, rounds, singerName, bracketSize }) {
  const [state, setState] = useState('idle'); // idle | loading | ready | error
  const [previewUrl, setPreviewUrl] = useState(null);
  const canvasRef = useRef(null); // 保留绘制好的画布用于下载

  const canShare = !!(champion && rounds && rounds.length > 1);

  const handleShare = async () => {
    if (!canShare) return;
    setState('loading');
    setPreviewUrl(null);
    try {
      const canvas = await renderShareCanvas({ champion, rounds, singerName, bracketSize });
      canvasRef.current = canvas;
      const url = canvas.toDataURL('image/jpeg', 0.92);
      setPreviewUrl(url);
      setState('ready');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ChampionShare] render failed:', e);
      setState('error');
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (champion && champion.name) ? champion.name : 'champion';
      a.href = url;
      a.download = `${singerName || ''}歌曲世界杯-${safeName}-冠军晋级之路.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/jpeg', 0.92);
  };

  const handleClose = () => {
    setState('idle');
    setPreviewUrl(null);
  };

  return (
    <>
      <div className="share-btn-wrap">
        <button
          className="btn share-trigger"
          type="button"
          onClick={handleShare}
          disabled={!canShare || state === 'loading'}
        >
          {state === 'loading' ? '⏳ 正在生成…' : '📸 分享晋级之路'}
        </button>
      </div>

      {state !== 'idle' && (
        <div className="share-modal" onClick={handleClose}>
          <div className="share-modal-inner" onClick={(e) => e.stopPropagation()}>
            {state === 'loading' && (
              <div className="share-loading">
                <span className="spin" />
                正在绘制冠军晋级之路…
              </div>
            )}
            {state === 'ready' && previewUrl && (
              <>
                <img className="share-preview" src={previewUrl} alt="冠军晋级之路" />
                <div className="share-actions">
                  <button className="btn primary" type="button" onClick={handleDownload}>
                    ⬇ 下载图片
                  </button>
                  <button className="btn" type="button" onClick={handleClose}>
                    关闭
                  </button>
                </div>
                <div className="share-hint">长按图片或点击"下载图片"保存</div>
              </>
            )}
            {state === 'error' && (
              <>
                <div className="share-loading">生成失败，请重试</div>
                <div className="share-actions">
                  <button className="btn" type="button" onClick={handleShare}>重试</button>
                  <button className="btn" type="button" onClick={handleClose}>关闭</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
