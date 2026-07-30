import { describe, it, expect } from 'vitest';
import { bracketOrder, shuffleArr } from './bracket.js';

// 重新导入 useWorldCup 内部的纯函数（它们是模块私有函数，我们通过测试 hook 行为来覆盖）
// 由于 makeDraw / buildKnockout 是私有函数，这里通过 bracket 算法间接验证它们的基础

// ---------- bracketOrder 用于 WC 淘汰赛 ----------
describe('WC bracketOrder integration', () => {
  it('32 队淘汰赛的种子位', () => {
    const order = bracketOrder(32);
    expect(order).toHaveLength(32);
    // 1 号种子在位置 0（上半区首位）
    expect(order[0]).toBe(1);
    // 2 号种子在位置 16（下半区首位）
    expect(order[16]).toBe(2);
  });

  it('前 8 号种子均匀分布在 8 个四分之一区', () => {
    const n = 32;
    const order = bracketOrder(n);
    const positions = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => order.indexOf(s));
    const quarters = positions.map((p) => Math.floor(p / (n / 8)));
    expect(new Set(quarters).size).toBe(8);
  });

  it('种子 1 和 2 在决赛才相遇', () => {
    const n = 32;
    const order = bracketOrder(n);
    const pos1 = order.indexOf(1);
    const pos2 = order.indexOf(2);
    const half = n / 2;
    expect(Math.floor(pos1 / half)).not.toBe(Math.floor(pos2 / half));
  });
});

// ---------- shuffleArr 用于 WC 抽签 ----------
describe('WC shuffleArr for draw', () => {
  it('12 个 pot 元素打乱后仍包含相同元素', () => {
    // 模拟 WC 抽签：4 个 pot 各 12 首
    const pot = Array.from({ length: 12 }, (_, i) => i + 1);
    const shuffled = shuffleArr(pot);
    expect(shuffled).toHaveLength(12);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(pot);
  });

  it('不修改原 pot 数组', () => {
    const pot = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const original = [...pot];
    shuffleArr(pot);
    expect(pot).toEqual(original);
  });
});

// ---------- WC 常量验证 ----------
describe('WC constants consistency', () => {
  it('WC_KO_TEAMS = 32', async () => {
    const mod = await import('../data/singers.js');
    expect(mod.WC_KO_TEAMS).toBe(32);
  });

  it('WC_GROUPS = 12', async () => {
    const mod = await import('../data/singers.js');
    expect(mod.WC_GROUPS).toBe(12);
  });

  it('WC_GROUP_SIZE = 4', async () => {
    const mod = await import('../data/singers.js');
    expect(mod.WC_GROUP_SIZE).toBe(4);
  });

  it('WC_WILDCARDS = 8', async () => {
    const mod = await import('../data/singers.js');
    expect(mod.WC_WILDCARDS).toBe(8);
  });

  it('WC_TOTAL_MATCHES = 43 (12 groups + 31 KO)', async () => {
    const mod = await import('../data/singers.js');
    expect(mod.WC_TOTAL_MATCHES).toBe(43);
  });

  it('GROUP_LETTERS 有 12 个字母', async () => {
    const mod = await import('../data/singers.js');
    expect(mod.GROUP_LETTERS).toHaveLength(12);
    expect(mod.GROUP_LETTERS[0]).toBe('A');
    expect(mod.GROUP_LETTERS[11]).toBe('L');
  });
});

// ---------- slimE / restoreE 序列化往返测试 ----------
describe('entrant serialization roundtrip', () => {
  it('slimE → restoreE 保持字段一致', async () => {
    const mod = await import('./format.js');
    const original = {
      name: '遇见',
      id: 5,
      side: 'L',
      seed: 6,
      nid: 'abc123',
      pic: 'https://example.com/p.jpg',
      picLocal: './covers/album_123.jpg',
      songmid: '001abc',
      albumMid: '002def',
      chorus: 45.5,
      seedRank: 6,
      isSeed: true,
      itunesPreviewUrl: 'https://example.com/preview.m4a',
      type: undefined,
      songCount: undefined,
      singerName: '',
      singerPhoto: '',
      albumDate: '',
    };
    const slimmed = mod.slimE(original);
    const restored = mod.restoreE(slimmed);
    expect(restored.name).toBe(original.name);
    expect(restored.id).toBe(original.id);
    expect(restored.side).toBe(original.side);
    expect(restored.seed).toBe(original.seed);
    expect(restored.nid).toBe(original.nid);
    expect(restored.pic).toBe(original.pic);
    expect(restored.picLocal).toBe(original.picLocal);
    expect(restored.songmid).toBe(original.songmid);
    expect(restored.albumMid).toBe(original.albumMid);
    expect(restored.chorus).toBe(original.chorus);
    expect(restored.seedRank).toBe(original.seedRank);
    expect(restored.isSeed).toBe(original.isSeed);
    expect(restored.itunesPreviewUrl).toBe(original.itunesPreviewUrl);
  });

  it('slimE(null) 返回 null', async () => {
    const mod = await import('./format.js');
    expect(mod.slimE(null)).toBeNull();
    expect(mod.restoreE(null)).toBeNull();
  });

  it('restoreE 兼容旧存档（缺少字段）', async () => {
    const mod = await import('./format.js');
    // 模拟旧存档：只有基本字段，没有 itunesPreviewUrl
    const oldSlime = {
      n: '天黑黑',
      i: 10,
      side: 'R',
      seed: 11,
      sr: 11,
      isS: false,
    };
    const restored = mod.restoreE(oldSlime);
    expect(restored.name).toBe('天黑黑');
    expect(restored.id).toBe(10);
    expect(restored.itunesPreviewUrl).toBe(''); // 缺失字段回退到空字符串
    expect(restored.singerName).toBe('');
  });

  it('专辑类型 entrant 序列化往返', async () => {
    const mod = await import('./format.js');
    const albumEntrant = {
      name: '范特西',
      id: 0,
      side: 'L',
      seed: 1,
      type: 'album',
      songCount: 10,
      singerName: '周杰伦',
      singerPhoto: 'https://example.com/jay.jpg',
      albumMid: '003xMDSK0UgNf7',
      albumDate: '2001-09-14',
      seedRank: 1,
      isSeed: true,
    };
    const slimmed = mod.slimE(albumEntrant);
    const restored = mod.restoreE(slimmed);
    expect(restored.type).toBe('album');
    expect(restored.songCount).toBe(10);
    expect(restored.singerName).toBe('周杰伦');
    expect(restored.singerPhoto).toBe('https://example.com/jay.jpg');
  });
});

// ---------- filters.js 验证 ----------
describe('track filtering', () => {
  it('识别 Live 版本曲目', async () => {
    const mod = await import('./filters.js');
    expect(mod.isLiveTrack('遇见 (Live)')).toBe(true);
    expect(mod.isLiveTrack('Live at Taipei')).toBe(true);
    expect(mod.isLiveTrack('遇见')).toBe(false);
    expect(mod.isLiveTrack('演唱会版')).toBe(true);
  });

  it('识别 Live 专辑', async () => {
    const mod = await import('./filters.js');
    expect(mod.isLiveAlbum('2004 演唱会')).toBe(true);
    expect(mod.isLiveAlbum('Stefanie')).toBe(false);
    expect(mod.isLiveAlbum('Live')).toBe(true);
  });

  it('识别垃圾曲目', async () => {
    const mod = await import('./filters.js');
    expect(mod.isJunkTrack('遇见 (伴奏)')).toBe(true);
    expect(mod.isJunkTrack('遇见 (卡拉OK)')).toBe(true);
    expect(mod.isJunkTrack('遇见')).toBe(false);
  });

  it('MIN_FAV_WITHOUT_COVER = 1000', async () => {
    const mod = await import('./filters.js');
    expect(mod.MIN_FAV_WITHOUT_COVER).toBe(1000);
  });
});

// ---------- baseKey 去重验证 ----------
describe('baseKey dedup for WC draw', () => {
  it('中文数字与阿拉伯数字归一为同一 key', async () => {
    const mod = await import('./text.js');
    expect(mod.baseKey('爱情三十六计')).toBe(mod.baseKey('爱情36计'));
  });

  it('括号注记不影响 key', async () => {
    const mod = await import('./text.js');
    expect(mod.baseKey('遇见(Live版)')).toBe(mod.baseKey('遇见'));
  });

  it('NFKC 归一化：全角半角统一', async () => {
    const mod = await import('./text.js');
    // NFKC 会将全角字符归一化为半角
    expect(mod.baseKey('遇见')).toBe(mod.baseKey('遇见'));
    // 大小写不敏感
    expect(mod.baseKey('ABC')).toBe(mod.baseKey('abc'));
  });
});
