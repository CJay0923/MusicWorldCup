import { describe, it, expect } from 'vitest';
import {
  shuffleArr,
  bracketOrder,
  drawSeats,
  seedBracketFlat,
  generateSeededBracket,
  generateRoundNames,
  freshRounds,
} from './bracket.js';

// ---------- shuffleArr ----------
describe('shuffleArr', () => {
  it('保持数组长度不变', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffleArr(arr)).toHaveLength(8);
  });

  it('不修改原数组', () => {
    const arr = [1, 2, 3, 4];
    const original = [...arr];
    shuffleArr(arr);
    expect(arr).toEqual(original);
  });

  it('打乱后包含相同元素', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = shuffleArr(arr);
    expect(shuffled.sort((a, b) => a - b)).toEqual(arr);
  });
});

// ---------- bracketOrder ----------
describe('bracketOrder', () => {
  it('n=2 返回 [1, 2]', () => {
    expect(bracketOrder(2)).toEqual([1, 2]);
  });

  it('n=4 返回 [1, 4, 2, 3]', () => {
    expect(bracketOrder(4)).toEqual([1, 4, 2, 3]);
  });

  it('n=8 返回 [1, 8, 4, 5, 2, 7, 3, 6]', () => {
    // 递归算法：[1,4,2,3] → 每位 s 追加 (8+1-s)
    // 1→8, 4→5, 2→7, 3→6
    expect(bracketOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it('种子 1 和 2 在决赛才相遇', () => {
    for (const n of [4, 8, 16, 32, 64, 128]) {
      const order = bracketOrder(n);
      const pos1 = order.indexOf(1);
      const pos2 = order.indexOf(2);
      // 1 号种子在上半区第一位，2 号种子在下半区第一位
      // 它们应该在不同的一半
      const half = n / 2;
      const p1Half = Math.floor(pos1 / half);
      const p2Half = Math.floor(pos2 / half);
      expect(p1Half).not.toBe(p2Half);
    }
  });

  it('前 4 号种子在半决赛才相遇', () => {
    for (const n of [8, 16, 32, 64, 128]) {
      const order = bracketOrder(n);
      const positions = [1, 2, 3, 4].map((s) => order.indexOf(s));
      const quarters = positions.map((p) => Math.floor(p / (n / 4)));
      // 4 个种子应该分布在 4 个不同的四分之一区
      expect(new Set(quarters).size).toBe(4);
    }
  });

  it('结果长度等于 n', () => {
    for (const n of [2, 4, 8, 16, 32, 64, 128]) {
      expect(bracketOrder(n)).toHaveLength(n);
    }
  });

  it('包含 1 到 n 的所有数字', () => {
    for (const n of [2, 4, 8, 16, 32, 64, 128]) {
      const order = bracketOrder(n);
      const sorted = [...order].sort((a, b) => a - b);
      expect(sorted).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    }
  });
});

// ---------- drawSeats ----------
describe('drawSeats', () => {
  it('返回长度为 n 的数组', () => {
    expect(drawSeats(8)).toHaveLength(8);
    expect(drawSeats(16)).toHaveLength(16);
    expect(drawSeats(32)).toHaveLength(32);
  });

  it('包含 0 到 n-1 的所有数字', () => {
    for (const n of [8, 16, 32, 64]) {
      const seats = drawSeats(n);
      const sorted = [...seats].sort((a, b) => a - b);
      expect(sorted).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });

  it('分档保护：每 4 个一档，档内打乱但不跨档', () => {
    // drawSeats 把 [0..n-1] 按 4 个一档打乱
    // 验证：第一档 (0,1,2,3) 打乱后仍在前 4 个位置
    const seats = drawSeats(32);
    const firstPot = seats.slice(0, 4).sort((a, b) => a - b);
    expect(firstPot).toEqual([0, 1, 2, 3]);

    // 第二档 (4,5,6,7) 打乱后仍在位置 4-7
    const secondPot = seats.slice(4, 8).sort((a, b) => a - b);
    expect(secondPot).toEqual([4, 5, 6, 7]);

    // 第三档 (8,9,10,11) 打乱后仍在位置 8-11
    const thirdPot = seats.slice(8, 12).sort((a, b) => a - b);
    expect(thirdPot).toEqual([8, 9, 10, 11]);
  });
});

// ---------- seedBracketFlat ----------
describe('seedBracketFlat', () => {
  it('返回长度为 n 的数组', () => {
    for (const n of [4, 8, 16, 32]) {
      expect(seedBracketFlat(n)).toHaveLength(n);
    }
  });

  it('无参数时使用 drawSeats 生成种子位', () => {
    const result = seedBracketFlat(8);
    expect(result).toHaveLength(8);
    // 所有元素应该是 0-7 之间的数字
    result.forEach((idx) => {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(8);
    });
  });

  it('接受自定义 seats 参数', () => {
    const seats = [0, 1, 2, 3, 4, 5, 6, 7];
    const result = seedBracketFlat(8, seats);
    // bracketOrder(8) = [1,8,4,5,2,7,3,6]
    // 映射 seats[order[i]-1]
    expect(result).toEqual([0, 7, 3, 4, 1, 6, 2, 5]);
  });
});

// ---------- generateSeededBracket ----------
describe('generateSeededBracket', () => {
  const makeEntrants = (n) =>
    Array.from({ length: n }, (_, i) => ({
      id: i,
      name: `song-${i}`,
      side: i < n / 2 ? 'L' : 'R',
      seed: i + 1,
    }));

  it('返回长度为 bracketSize 的数组', () => {
    const entrants = makeEntrants(8);
    const seeds = [0, 1, 2, 3, 4, 5, 6, 7];
    const result = generateSeededBracket(entrants, seeds, 8);
    expect(result).toHaveLength(8);
  });

  it('每个元素都是 entrant 对象的副本', () => {
    const entrants = makeEntrants(4);
    const seeds = [0, 1, 2, 3];
    const result = generateSeededBracket(entrants, seeds, 4);
    result.forEach((e) => {
      expect(e).toHaveProperty('id');
      expect(e).toHaveProperty('name');
      expect(e).toHaveProperty('side');
    });
  });

  it('不包含 null（当 entrants 足够时）', () => {
    const entrants = makeEntrants(8);
    const seeds = [0, 1, 2, 3, 4, 5, 6, 7];
    const result = generateSeededBracket(entrants, seeds, 8);
    result.forEach((e) => {
      expect(e).not.toBeNull();
    });
  });
});

// ---------- generateRoundNames ----------
describe('generateRoundNames', () => {
  it('128强 → 7 轮', () => {
    const names = generateRoundNames(128);
    expect(names).toHaveLength(7);
    expect(names[0]).toBe('128强');
    expect(names[names.length - 1]).toBe('决赛');
  });

  it('32强 → 5 轮', () => {
    const names = generateRoundNames(32);
    expect(names).toHaveLength(5);
    expect(names[0]).toBe('32强');
    expect(names).toContain('16强');
    expect(names).toContain('8强');
    expect(names).toContain('4强');
    expect(names[names.length - 1]).toBe('决赛');
  });

  it('8强 → 3 轮', () => {
    const names = generateRoundNames(8);
    expect(names).toHaveLength(3);
    expect(names[0]).toBe('8强');
    expect(names[1]).toBe('4强');
    expect(names[2]).toBe('决赛');
  });

  it('4强 → 2 轮', () => {
    const names = generateRoundNames(4);
    expect(names).toHaveLength(2);
    expect(names[0]).toBe('4强');
    expect(names[1]).toBe('决赛');
  });
});

// ---------- freshRounds ----------
describe('freshRounds', () => {
  const makeEntrants = (n) =>
    Array.from({ length: n }, (_, i) => ({
      id: i,
      name: `song-${i}`,
      side: i < n / 2 ? 'L' : 'R',
      seed: i + 1,
    }));

  it('生成正确的轮次数（log2(n) + 1）', () => {
    const entrants = makeEntrants(8);
    const seeds = [0, 1, 2, 3, 4, 5, 6, 7];
    const rounds = freshRounds(8, entrants, seeds);
    // 8强: 3 轮比赛 + 1 轮冠军 = 4 个数组
    expect(rounds).toHaveLength(4);
  });

  it('第一轮长度等于 bracketSize', () => {
    const entrants = makeEntrants(8);
    const seeds = [0, 1, 2, 3, 4, 5, 6, 7];
    const rounds = freshRounds(8, entrants, seeds);
    expect(rounds[0]).toHaveLength(8);
  });

  it('后续轮次长度递减一半', () => {
    const entrants = makeEntrants(16);
    const seeds = Array.from({ length: 16 }, (_, i) => i);
    const rounds = freshRounds(16, entrants, seeds);
    expect(rounds[0]).toHaveLength(16);
    expect(rounds[1]).toHaveLength(8);
    expect(rounds[2]).toHaveLength(4);
    expect(rounds[3]).toHaveLength(2);
    expect(rounds[4]).toHaveLength(1);
  });

  it('最后一轮（冠军轮）初始为 [null]', () => {
    const entrants = makeEntrants(8);
    const seeds = [0, 1, 2, 3, 4, 5, 6, 7];
    const rounds = freshRounds(8, entrants, seeds);
    const lastRound = rounds[rounds.length - 1];
    expect(lastRound).toHaveLength(1);
    expect(lastRound[0]).toBeNull();
  });

  it('第一轮所有位置都有 entrant', () => {
    const entrants = makeEntrants(8);
    const seeds = [0, 1, 2, 3, 4, 5, 6, 7];
    const rounds = freshRounds(8, entrants, seeds);
    rounds[0].forEach((e) => {
      expect(e).not.toBeNull();
      expect(e).toHaveProperty('name');
    });
  });
});
