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
import { getCoverBase, coverUrl, isJsDelivrCover } from '../lib/assets.js';

// ---------------- 常量 ----------------
const FONT =
  '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Hiragino Sans GB",sans-serif';
const GOLD = '#ffd24a';
const IMG_TIMEOUT = 5000;

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

// 多行换行：将文本按 maxWidth 拆分为最多 maxLines 行，最后一行超出则截断
function wrapText(ctx, text, maxWidth, maxLines = 2) {
  if (!text) return [];
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const lines = [];
  let current = '';
  for (const ch of text) {
    if (ctx.measureText(current + ch).width > maxWidth && current) {
      lines.push(current);
      current = ch;
      if (lines.length >= maxLines - 1) break;
    } else {
      current += ch;
    }
  }
  if (current) {
    // 最后一行若超出宽度则截断
    if (lines.length >= maxLines - 1 && ctx.measureText(current).width > maxWidth) {
      current = fitText(ctx, current, maxWidth);
    }
    lines.push(current);
  }
  return lines.slice(0, maxLines);
}

// CORS 代理：将 R2 / jsDelivr 兜底封面转为可通过 CORS 的 URL。
// 同源封面（./covers/...）无需代理，由 loadImage 直接加载（canvas 可读、不污染）。
function corsProxyUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  // R2 封面：经 weserv 代理以获取 CORS 头（canvas 绘制需要，避免污染）
  const base = getCoverBase();
  if (base && url.startsWith(base)) {
    const stripped = url.replace(/^https?:\/\//, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}`;
  }
  // jsDelivr 封面：自带 CORS，但经 weserv 代理双保险确保 canvas 不污染
  if (url.includes('cdn.jsdelivr.net')) {
    const stripped = url.replace(/^https?:\/\//, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}`;
  }
  // 本地路径转 jsDelivr CDN URL（用于分享链接场景，jsDelivr 自带 CORS）
  if (url.startsWith('./covers/album_') || url.startsWith('/covers/album_')) {
    const m = url.match(/album_([^.]+)/);
    if (m) return coverUrl(m[1]);
  }
  // jsDelivr URL 已有 CORS，直接使用
  if (isJsDelivrCover(url)) return url;
  // 其他远程 URL 通过 weserv 代理获取 CORS 头
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const stripped = url.replace(/^https?:\/\//, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}`;
  }
  return url;
}

// 根据 entrant 数据构建封面 URL 列表（多级 fallback）
// 优先级：同源(picLocal/coverUrl) > pic（不调外部音乐 API；jsDelivr 仅作兜底）
function buildCoverUrls(entrant, size = 300) {
  if (!entrant) return [];
  const urls = [];
  const dim = `${size}x${size}`;
  // 1. picLocal（同源封面）— 最高优先级
  if (entrant.picLocal) urls.push(entrant.picLocal);
  // 2. 通过 albumMid 构建 jsDelivr URL
  if (entrant.albumMid) {
    const jsd = coverUrl(entrant.albumMid);
    if (!urls.includes(jsd)) urls.push(jsd);
  }
  // 3. pic 字段（可能是相对路径 /covers/xxx 或已有 URL）
  if (entrant.pic) {
    const u = entrant.pic;
    if (!urls.includes(u)) urls.push(u);
  }
  return urls;
}

// 加载单张封面图：本地图片（同源）直接加载，远程图片通过 CORS 代理
// 返回 { img, tainted } 或 null
function loadImage(url, timeout = IMG_TIMEOUT) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);

    const proxiedUrl = corsProxyUrl(url);
    const isLocal =
      url.startsWith('/') ||
      url.startsWith('./') ||
      url.startsWith(window.location.origin);

    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    if (isLocal) {
      const img = new Image();
      img.onload = () => finish({ img, tainted: false });
      img.onerror = () => finish(null);
      img.src = url;
      setTimeout(() => {
        if (!img.complete) finish(null);
      }, timeout);
      return;
    }

    // 远程图片：先 CORS 代理 + crossOrigin，失败则不带 crossOrigin 兜底
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => finish({ img, tainted: false });
    img.onerror = () => {
      const img2 = new Image();
      img2.onload = () => finish({ img: img2, tainted: true });
      img2.onerror = () => finish(null);
      img2.src = proxiedUrl;
      setTimeout(() => {
        if (!img2.complete) finish(null);
      }, timeout);
    };
    img.src = proxiedUrl;
    setTimeout(() => {
      if (!img.complete) finish(null);
    }, timeout);
  });
}

// 加载 entrant 的封面图（并行加载所有 URL，按优先级选择最佳结果）
function loadEntrantCover(entrant, timeout = IMG_TIMEOUT, size = 300) {
  const urls = buildCoverUrls(entrant, size);
  if (urls.length === 0) return Promise.resolve(null);

  return (async () => {
    const results = await Promise.allSettled(urls.map((url) => loadImage(url, timeout)));

    let taintedResult = null;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        if (!r.value.tainted) return r.value;
        if (!taintedResult) taintedResult = r.value;
      }
    }
    return taintedResult;
  })();
}

// 占位封面：基于歌曲 ID 的 hue 渐变 + 音符 ♪（照搬 music-cup share.js）
function drawPlaceholder(ctx, x, y, size, entrant) {
  const seed = String(entrant?.songmid || entrant?.name || entrant?.id || '♪');
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, `hsl(${h}, 45%, 30%)`);
  g.addColorStop(1, `hsl(${(h + 40) % 360}, 50%, 16%)`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `${Math.round(size * 0.6)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♪', x + size / 2, y + size / 2);
}

// 绘制封面(带圆角裁剪 + 边框)
function drawCover(ctx, x, y, size, img, isChampPath, entrant) {
  ctx.save();
  roundRect(ctx, x, y, size, size, Math.max(2, size * 0.18));
  ctx.clip();
  if (img && img.complete && img.naturalWidth > 0) {
    try {
      ctx.drawImage(img, x, y, size, size);
    } catch {
      drawPlaceholder(ctx, x, y, size, entrant);
    }
  } else {
    drawPlaceholder(ctx, x, y, size, entrant);
  }
  ctx.restore();
  ctx.lineWidth = isChampPath ? 1.5 : 1;
  ctx.strokeStyle = isChampPath ? GOLD : 'rgba(255,255,255,0.16)';
  roundRect(ctx, x, y, size, size, Math.max(2, size * 0.18));
  ctx.stroke();
}

// 绘制单张对阵卡片
function drawCard(ctx, opts) {
  const {
    x,
    y,
    w,
    h,
    entrant,
    side,
    isChampPath,
    isWinner,
    coverImg,
    coverSize,
    vertical,
  } = opts;
  if (!entrant) return;

  // 背景（提高非冠军路径的可见度）
  roundRect(ctx, x, y, w, h, 5);
  if (isChampPath) {
    ctx.fillStyle = 'rgba(255,210,74,0.18)';
  } else if (isWinner) {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
  }
  ctx.fill();
  ctx.lineWidth = isChampPath ? 1.6 : 1;
  ctx.strokeStyle = isChampPath
    ? GOLD
    : isWinner
      ? 'rgba(255,255,255,0.2)'
      : 'rgba(255,255,255,0.13)';
  ctx.stroke();

  const img = coverImg;

  if (vertical) {
    // 竖向布局：封面在上、歌名在下（小规模时用，给文字更多宽度）
    const cs = Math.min(coverSize, w - 8);
    const cx = x + (w - cs) / 2;
    const cy = y + 4;
    drawCover(ctx, cx, cy, cs, img, isChampPath, entrant);

    const textAreaH = h - cs - 8;
    const fontSize = Math.max(10, Math.min(14, textAreaH - 4));
    ctx.fillStyle = isChampPath
      ? '#ffffff'
      : isWinner
        ? '#f1f2fb'
        : 'rgba(200,206,236,0.72)';
    ctx.font = `${isChampPath ? 700 : 600} ${fontSize}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameMaxW = w - 6;
    const lines = wrapText(ctx, entrant.name, nameMaxW, 2);
    const lineH = fontSize * 1.2;
    const startY = cy + cs + textAreaH / 2 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, x + w / 2, startY + i * lineH);
    });
  } else {
    // 横向布局：封面在侧、歌名在另一侧（大规模时用）
    const cs = coverSize;
    const cy = y + (h - cs) / 2;
    const cx = side === 'L' ? x + 3 : x + w - cs - 3;
    drawCover(ctx, cx, cy, cs, img, isChampPath, entrant);

    const pad = 4;
    const nameX = side === 'L' ? cx + cs + pad : cx - pad;
    const nameMaxW = w - cs - pad * 2 - 2;
    // 大规模时用更小字号，确保歌名能显示更多字符
    const fontSize = Math.max(8, Math.min(11, Math.round(h * 0.26)));
    ctx.fillStyle = isChampPath
      ? '#ffffff'
      : isWinner
        ? '#f1f2fb'
        : 'rgba(200,206,236,0.6)';
    ctx.font = `${isChampPath ? 700 : 600} ${fontSize}px ${FONT}`;
    ctx.textAlign = side === 'L' ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    // 大规模时最多 3 行，小规模最多 2 行
    const maxLines = w < 70 ? 3 : 2;
    const lines = wrapText(ctx, entrant.name, nameMaxW, maxLines);
    const lineH = fontSize * 1.15;
    const startY = y + h / 2 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, nameX, startY + i * lineH);
    });
  }
}

// 绘制一场比赛的连接线(子->父) — 使用平滑贝塞尔曲线
// childEdgeX: 子卡片朝向父侧的边缘 x；parentEdgeX: 父卡片朝向子侧的边缘 x
// direction: 'L' 左半区（向右延伸）| 'R' 右半区（向左延伸）
function drawConnector(
  ctx,
  childEdgeAX,
  ya,
  childEdgeBX,
  yb,
  jointX,
  parentEdgeX,
  yw,
  isChampPath,
  lineW,
  direction = 'L',
) {
  ctx.save();
  ctx.strokeStyle = isChampPath ? GOLD : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = isChampPath ? Math.max(2.4, lineW * 1.8) : lineW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 用三次贝塞尔曲线代替直角拐弯，视觉更柔和
  // 控制点偏移量：水平方向上取子-父距离的一半
  const drawCurve = (x1, y1, x2, y2) => {
    const dx = Math.abs(x2 - x1);
    const cpOffset = dx * 0.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    if (direction === 'L') {
      // 左半区：从子向右延伸到父
      ctx.bezierCurveTo(x1 + cpOffset, y1, x2 - cpOffset, y2, x2, y2);
    } else {
      // 右半区：从子向左延伸到父
      ctx.bezierCurveTo(x1 - cpOffset, y1, x2 + cpOffset, y2, x2, y2);
    }
    ctx.stroke();
  };

  // 子 A -> joint 中点
  drawCurve(childEdgeAX, ya, jointX, yw);
  // 子 B -> joint 中点
  drawCurve(childEdgeBX, yb, jointX, yw);
  // joint -> 父
  drawCurve(jointX, yw, parentEdgeX, yw);

  ctx.restore();
}

// ---------------- 主渲染函数 ----------------
async function renderShareCanvas({ champion, rounds, singerName, bracketSize }) {
  const bs = bracketSize || (rounds && rounds[0] ? rounds[0].length : 128);
  const numRounds = Math.log2(bs); // 7 for 128, 6 for 64, 5 for 32
  const matches = buildMatches(rounds);

  // ---- 布局常量（根据参赛规模动态调整）----
  // 核心思路：小规模(≤8)用竖向卡片(封面上文字下)避免歌名截断，
  // 中大规模用横向卡片(封面侧文字侧)保证紧凑性。
  const useVertical = bs <= 8;
  const halfCount = bs / 2;
  const margin = 22;
  const headerH = 96;
  const footerH = 64;

  // 行高：竖向布局需要更高（封面+文字堆叠），横向布局可以矮
  const rowH =
    bs >= 128
      ? 34
      : bs >= 64
        ? 42
        : bs >= 32
          ? 50
          : bs >= 16
            ? 62
            : bs >= 8
              ? useVertical
                ? 95
                : 82
              : useVertical
                ? 120
                : 105;
  const sideSpan = halfCount * rowH;
  const H = headerH + sideSpan + footerH;

  // 冠军块大小：小规模时比例更小（避免占据过多画布）
  const champRatio = bs <= 8 ? 0.32 : bs <= 16 ? 0.36 : bs <= 32 ? 0.40 : 0.44;
  const champCover = Math.min(168, Math.max(72, Math.round(sideSpan * champRatio)));
  const champHalfW = Math.max(72, Math.round(champCover * 0.6 + 18));

  // 列间距
  const colGap = bs >= 64 ? 8 : 14;

  // 画布宽度
  const sideCols = numRounds;
  const targetCardW = bs >= 64 ? 70 : bs >= 32 ? 75 : bs >= 16 ? 95 : bs >= 8 ? 115 : 135;
  const idealSideWidth = sideCols * (targetCardW + colGap);
  const maxW = bs <= 8 ? 760 : bs <= 16 ? 860 : bs <= 32 ? 950 : 1200;
  const W = Math.max(520, Math.min(maxW, 2 * (margin + idealSideWidth + champHalfW)));
  const centerX = W / 2;
  const centerY = headerH + sideSpan / 2;

  // 实际侧区宽度
  const sideWidth = centerX - champHalfW - margin;
  const colWidth = sideWidth / sideCols;
  const cardW = colWidth - colGap;
  const cardH = rowH - 4;

  const leftColX = (c) => margin + c * colWidth;
  const rightColX = (c) => W - margin - (c + 1) * colWidth;
  const yOf = (r, j) => headerH + (j + 0.5) * rowH * Math.pow(2, r);
  const halfCountR = (r) => bs >> (r + 1);

  // 封面尺寸：竖向时基于卡片宽度，横向时基于卡片高度
  const coverSize = (r) =>
    useVertical
      ? Math.min(Math.round(cardW * 0.55), Math.max(20, cardH - 30))
      : Math.min(
          cardH - 4,
          Math.max(12, Math.round(Math.min(cardH, cardW) * 0.36 + r * 1.2)),
        );

  // 连接线线宽：小规模用更粗的线增强可见性
  const connLineW = bs >= 64 ? 1.0 : bs >= 16 ? 1.3 : 1.5;
  const champConnLineW = Math.max(1.8, connLineW * 1.4);

  // ---- 加载封面图（照搬 music-cup share.js thumbs Map：按歌曲 ID 去重）----
  const coverKey = (e) => (e && e.songmid ? e.songmid : `id-${e?.id}`);
  const thumbs = new Map(); // coverKey -> { img, tainted }
  const champThumbs = new Map(); // 冠军 600px 高清版

  // 去重收集所有需加载封面的参赛者
  const toLoad = new Map();
  if (champion) toLoad.set(coverKey(champion), champion);
  for (let r = 0; r < rounds.length; r++) {
    for (const e of rounds[r] || []) {
      if (e) toLoad.set(coverKey(e), e);
    }
  }

  await Promise.race([
    Promise.all(
      [...toLoad.entries()].map(async ([key, entrant]) => {
        const result = await loadEntrantCover(entrant);
        if (result) thumbs.set(key, result);
      }),
    ),
    new Promise((r) => setTimeout(r, IMG_TIMEOUT)),
  ]);

  // 冠军单独加载 600px 高清版（照搬 music-cup）
  if (champion) {
    const hiRes = await loadEntrantCover(champion, IMG_TIMEOUT, 600);
    if (hiRes) champThumbs.set(coverKey(champion), hiRes);
  }

  // 照搬 music-cup thumbs.get(e.s)：按歌曲 ID 取该歌自己的封面
  const getCoverImg = (entrant) => {
    if (!entrant) return null;
    const key = coverKey(entrant);
    // 冠军优先用 600px 高清版
    if (champion && entrant.id === champion.id) {
      const hi = champThumbs.get(key);
      if (hi) return hi.img;
    }
    const hit = thumbs.get(key);
    return hit ? hit.img : null;
  };

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
      drawConnector(
        ctx,
        childEdge,
        yA,
        childEdge,
        yB,
        jointX,
        parentEdge,
        yW,
        isChampPath,
        connLineW,
        'L',
      );
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
      drawConnector(
        ctx,
        childEdge,
        yA,
        childEdge,
        yB,
        jointX,
        parentEdge,
        yW,
        isChampPath,
        connLineW,
        'R',
      );
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
    ctx.strokeStyle = isChamp ? GOLD : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = isChamp ? champConnLineW : connLineW;
    ctx.beginPath();
    ctx.moveTo(leftColX(numRounds - 1) + cardW, centerY);
    ctx.lineTo(champLeft, centerY);
    ctx.stroke();
  }
  // 右侧决赛选手 -> 冠军
  if (rightFinalist) {
    const isChamp = rightFinalist.id === champId;
    ctx.strokeStyle = isChamp ? GOLD : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = isChamp ? champConnLineW : connLineW;
    ctx.beginPath();
    ctx.moveTo(rightColX(numRounds - 1), centerY);
    ctx.lineTo(champRight, centerY);
    ctx.stroke();
  }
  ctx.restore();

  // ---- 画卡片 ----
  for (let r = 0; r < numRounds; r++) {
    const lc = halfCountR(r);
    const cs = coverSize(r);
    for (let j = 0; j < lc; j++) {
      const eL = rounds[r] ? rounds[r][j] : null;
      const eR = rounds[r] ? rounds[r][lc + j] : null;
      if (eL) {
        const isChamp = eL.id === champId;
        const isWinner = r === numRounds - 1 ? true : isAdvancer(rounds, r, eL);
        drawCard(ctx, {
          x: leftColX(r),
          y: yOf(r, j) - cardH / 2,
          w: cardW,
          h: cardH,
          entrant: eL,
          side: 'L',
          isChampPath: isChamp,
          isWinner,
          coverImg: getCoverImg(eL),
          coverSize: cs,
          vertical: useVertical,
        });
      }
      if (eR) {
        const isChamp = eR.id === champId;
        const isWinner = r === numRounds - 1 ? true : isAdvancer(rounds, r, eR);
        drawCard(ctx, {
          x: rightColX(r),
          y: yOf(r, j) - cardH / 2,
          w: cardW,
          h: cardH,
          entrant: eR,
          side: 'R',
          isChampPath: isChamp,
          isWinner,
          coverImg: getCoverImg(eR),
          coverSize: cs,
          vertical: useVertical,
        });
      }
    }
  }

  // ---- 中央冠军块 ----
  drawChampionBlock(ctx, {
    centerX,
    centerY,
    size: champCover,
    champion,
    coverImg: getCoverImg(champion),
    singerName,
  });

  // ---- 底部品牌标识 ----
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText(
    `🎵 ${singerName || ''}歌曲世界杯 · MUSIC CUP`,
    centerX,
    H - footerH / 2 - 4,
  );
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
function drawChampionBlock(
  ctx,
  { centerX, centerY, size, champion, coverImg, singerName },
) {
  const half = size / 2;
  const coverY = centerY - half - 6;
  // 字号随封面尺寸缩放
  const crownFont = Math.max(20, Math.min(30, Math.round(size * 0.18)));
  const nameFont = Math.max(15, Math.min(22, Math.round(size * 0.13)));
  const labelFont = Math.max(11, Math.min(14, Math.round(size * 0.085)));
  const nameOffset = Math.max(16, Math.round(size * 0.13));
  const labelOffset = Math.max(20, Math.round(size * 0.16));

  // 外层光晕（已移除，按设计约束不再使用径向光斑）
  // 保留冠军块仅用实色边框强调

  // 皇冠
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${crownFont}px ${FONT}`;
  ctx.fillText('👑', centerX, coverY - crownFont * 0.55);

  // 封面
  const img = coverImg;
  const cornerR = Math.max(8, Math.round(size * 0.1));
  ctx.save();
  roundRect(ctx, centerX - half, coverY, size, size, cornerR);
  ctx.clip();
  if (img && img.complete && img.naturalWidth > 0) {
    try {
      ctx.drawImage(img, centerX - half, coverY, size, size);
    } catch {
      drawPlaceholder(ctx, centerX - half, coverY, size, champion);
    }
  } else {
    drawPlaceholder(ctx, centerX - half, coverY, size, champion);
  }
  ctx.restore();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = GOLD;
  roundRect(ctx, centerX - half, coverY, size, size, cornerR);
  ctx.stroke();

  // 歌名
  const nameY = coverY + size + nameOffset;
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${nameFont}px ${FONT}`;
  const name = champion ? champion.name : '—';
  const nameLines = wrapText(ctx, name, 320, 2);
  const nameLineH = nameFont * 1.15;
  const nameStartY = nameY - ((nameLines.length - 1) * nameLineH) / 2;
  nameLines.forEach((line, i) => {
    ctx.fillText(line, centerX, nameStartY + i * nameLineH);
  });

  // "🏆 冠军" 标签药丸
  const labelY = nameY + nameLineH + labelOffset;
  const label = '🏆 冠军';
  ctx.font = `700 ${labelFont}px ${FONT}`;
  const labelW = ctx.measureText(label).width + 24;
  const labelH = Math.max(20, labelFont + 10);
  roundRect(ctx, centerX - labelW / 2, labelY - labelH / 2, labelW, labelH, labelH / 2);
  ctx.fillStyle = 'rgba(255,210,74,0.18)';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,210,74,0.55)';
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.fillText(label, centerX, labelY);
}

// ---------------- React 组件 ----------------
export default function ChampionShare({
  champion,
  history,
  rounds,
  singerName,
  bracketSize,
}) {
  const [state, setState] = useState('idle'); // idle | loading | ready | error
  const [previewUrl, setPreviewUrl] = useState(null);
  const canvasRef = useRef(null); // 保留绘制好的画布用于下载

  // 缓存：以 champion id + bracketSize 为 key，避免重复渲染
  const cacheRef = useRef({ key: null, canvas: null, url: null });

  const canShare = !!(champion && rounds && rounds.length > 1);

  const handleShare = async () => {
    if (!canShare) return;
    // 命中缓存：直接复用
    const cacheKey = `${champion?.id || ''}-${bracketSize || ''}`;
    if (cacheRef.current.key === cacheKey && cacheRef.current.canvas) {
      canvasRef.current = cacheRef.current.canvas;
      setPreviewUrl(cacheRef.current.url);
      setState('ready');
      return;
    }
    setState('loading');
    setPreviewUrl(null);
    try {
      const canvas = await renderShareCanvas({
        champion,
        rounds,
        singerName,
        bracketSize,
      });
      canvasRef.current = canvas;
      let url;
      try {
        url = canvas.toDataURL('image/jpeg', 0.92);
      } catch {
        // canvas 被 CORS 污染，尝试用非 tainted 的图片重新渲染
        // 如果仍然失败，显示错误提示
        console.warn('[ChampionShare] Canvas tainted, cannot export');
        setState('error');
        return;
      }
      // 写入缓存
      cacheRef.current = { key: cacheKey, canvas, url };
      setPreviewUrl(url);
      setState('ready');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ChampionShare] render failed:', err);
      setState('error');
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = champion && champion.name ? champion.name : 'champion';
        a.href = url;
        a.download = `${singerName || ''}歌曲世界杯-${safeName}-冠军晋级之路.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      'image/jpeg',
      0.92,
    );
  };

  const handleClose = () => {
    setState('idle');
    setPreviewUrl(null);
  };

  return (
    <>
      <div className="mt-5 flex justify-center">
        <button
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-accent/45 bg-accent/15 px-6 py-3 text-sm font-semibold text-accent transition-all duration-200 hover:border-accent/70 hover:bg-accent/25 active:scale-[0.97] disabled:cursor-default disabled:opacity-55"
          type="button"
          onClick={handleShare}
          disabled={!canShare || state === 'loading'}
        >
          {state === 'loading' ? '⏳ 正在生成…' : '📸 分享晋级之路'}
        </button>
      </div>

      {state !== 'idle' && (
        <div
          className="fixed inset-0 z-[--z-share] flex items-center justify-center overflow-y-auto bg-[rgba(6,8,20,0.85)] p-6 backdrop-blur-[6px] animate-[fade_0.3s_ease]"
          onClick={handleClose}
        >
          <div
            className="flex max-h-[92vh] max-w-[min(1080px,96vw)] flex-col items-center gap-4 animate-[pop_0.35s_cubic-bezier(0.22,1.3,0.36,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {state === 'loading' && (
              <div className="flex items-center gap-3 text-sm text-muted">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
                正在绘制冠军晋级之路…
              </div>
            )}
            {state === 'ready' && previewUrl && (
              <>
                <img
                  className="max-h-[74vh] max-w-[min(1040px,94vw)] rounded-md border border-white/10 bg-bg2 object-contain shadow-[--shadow]"
                  src={previewUrl}
                  alt="冠军晋级之路"
                />
                <div className="flex gap-3">
                  <button
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-accent/60 bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)] active:translate-y-0 active:scale-[0.97]"
                    type="button"
                    onClick={handleDownload}
                  >
                    ⬇ 下载图片
                  </button>
                  <button
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-[13px] font-semibold text-ink transition-all duration-200 hover:border-white/25 hover:bg-white/10 active:scale-[0.96]"
                    type="button"
                    onClick={handleClose}
                  >
                    关闭
                  </button>
                </div>
                <div className="text-xs text-muted">长按图片或点击“下载图片”保存</div>
              </>
            )}
            {state === 'error' && (
              <>
                <div className="text-sm text-muted">生成失败，请重试</div>
                <div className="flex gap-3">
                  <button
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-[13px] font-semibold text-ink transition-all duration-200 hover:border-white/25 hover:bg-white/10 active:scale-[0.96]"
                    type="button"
                    onClick={handleShare}
                  >
                    重试
                  </button>
                  <button
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-[13px] font-semibold text-ink transition-all duration-200 hover:border-white/25 hover:bg-white/10 active:scale-[0.96]"
                    type="button"
                    onClick={handleClose}
                  >
                    关闭
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
