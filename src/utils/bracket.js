// Bracket generation utilities

export function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 标准种子签位序：[1,n] 两端相遇于决赛。
 * 递归算法：[1] → [1,4] → [1,4,2,3] → [1,4,2,3,5,8,6,7] ...
 * 保证同档种子在决赛前不相遇。支持任意 2 的幂。
 * @param {number} n - 签表大小（必须是 2 的幂）
 * @returns {number[]} 种子号排列，如 n=4 → [1,4,2,3]
 */
export function bracketOrder(n) {
  let arr = [1];
  while (arr.length < n) {
    const m = arr.length * 2;
    const next = [];
    for (const s of arr) next.push(s, m + 1 - s);
    arr = next;
  }
  return arr;
}

/**
 * 分档抽签保护（经典模式）：按每 4 首一档、档内打乱。
 * 保证前两热门不会首轮内战（0% 概率）。
 * @param {number} n - 总参赛数
 * @returns {number[]} 种子位 → 热门度名次的排列
 */
export function drawSeats(n) {
  const seats = Array.from({ length: n }, (_, i) => i);
  for (let p = 0; p < n; p += 4) {
    const pot = shuffleArr(seats.slice(p, p + 4));
    seats.splice(p, pot.length, ...pot);
  }
  return seats;
}

/**
 * 纯淘汰赛签表（无小组赛）：按标准蛇形把种子位落到签表上。
 * @param {number} n - 签表大小
 * @param {number[]} [seats] - 可选的种子位排列，缺省则用 drawSeats 生成
 * @returns {number[]} 签表位置 → 种子号(0-indexed)
 */
export function seedBracketFlat(n, seats) {
  const s = seats && seats.length === n ? seats : drawSeats(n);
  return bracketOrder(n).map(x => s[x - 1]);
}

export function generateTiers(N) {
  const tiers = [];
  const maxTiers = Math.min(Math.log2(N) - 1, 5);
  for (let t = 1; t <= maxTiers; t++) {
    const count = Math.pow(2, t - 1);
    const start = t === 1 ? 0 : N / Math.pow(2, t);
    const step = t === 1 ? N / 2 : N / Math.pow(2, t - 1);
    const zones = [];
    for (let i = 0; i < count; i++) zones.push(start + i * step);
    tiers.push({ zones, count });
  }
  return tiers;
}

export function generateSeededBracket(entrants, seeds, bracketSize) {
  const N = bracketSize;
  // 使用分档保护算法：每4首一档、档内打乱 + 标准蛇形落位
  const order = seedBracketFlat(N);
  return order.map(idx => {
    const seedIdx = seeds[idx];
    const e = entrants[seedIdx];
    return e ? { ...e } : null;
  }).filter(Boolean);
}

export function generateRoundNames(bracketSize) {
  const names = [];
  let sz = bracketSize;
  const nm = { 2: '决赛', 4: '4强', 8: '8强', 16: '16强', 32: '32强', 64: '64强', 128: '128强' };
  while (sz > 1) {
    names.push(nm[sz] || sz + '强');
    sz /= 2;
  }
  return names;
}

export function freshRounds(bracketSize, entrants, seeds) {
  const numRounds = Math.log2(bracketSize);
  const rounds = [];
  rounds[0] = generateSeededBracket(entrants, seeds, bracketSize);
  for (let i = 1; i <= numRounds; i++) {
    rounds[i] = new Array(rounds[i - 1].length / 2).fill(null);
  }
  return rounds;
}
