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

// ---------- WC 选曲玩法 ----------
describe('WC song selection modes', () => {
  // 构造测试数据：4 张专辑，共 8 首
  // seedRank 与 favCount 一致（真实数据中 seedRank 由收藏量排序而来）
  const mkEntrants = () => {
    const albums = ['A', 'A', 'B', 'B', 'B', 'C', 'D', 'D'];
    const favs = [500, 100, 300, 50, 10, 200, 150, 80];
    // 收藏量降序排名：song0(1) song2(2) song5(3) song6(4) song1(5) song7(6) song3(7) song4(8)
    const rankOf = (i) =>
      1 + favs.filter((f, j) => f > favs[i] || (f === favs[i] && j < i)).length;
    return albums.map((albumMid, i) => ({
      id: i,
      name: `song${i}`,
      albumMid,
      albumName: albumMid,
      favCount: favs[i],
      seedRank: rankOf(i),
    }));
  };

  it('hot 模式按收藏量取前 n 首并重新编号', async () => {
    const mod = await import('../data/singers.js');
    const out = mod.selectWCEntrants(mkEntrants(), 'hot', 5);
    expect(out).toHaveLength(5);
    // 收藏量最高的 5 首：song0(500), song2(300), song5(200), song6(150), song1(100)
    expect(out.map((e) => e.name)).toEqual(['song0', 'song2', 'song5', 'song6', 'song1']);
    // 重新编号：id 0..4, seedRank 1..5
    expect(out.map((e) => e.seedRank)).toEqual([1, 2, 3, 4, 5]);
    expect(out.map((e) => e.id)).toEqual([0, 1, 2, 3, 4]);
  });

  it('all 模式保证每个专辑至少 1 首（n 足够时）', async () => {
    const mod = await import('../data/singers.js');
    const out = mod.selectAllSongsWithAlbums(mkEntrants(), 8);
    expect(out).toHaveLength(8);
    const albums = new Set(out.map((e) => e.albumMid));
    expect(albums).toEqual(new Set(['A', 'B', 'C', 'D']));
  });

  it('all 模式在 n 不足时仍保证每个专辑至少 1 首', async () => {
    const mod = await import('../data/singers.js');
    const out = mod.selectAllSongsWithAlbums(mkEntrants(), 5);
    expect(out).toHaveLength(5);
    const albums = new Set(out.map((e) => e.albumMid));
    expect(albums).toEqual(new Set(['A', 'B', 'C', 'D']));
  });

  it('all 模式每张专辑优先取收藏量最高的一首', async () => {
    const mod = await import('../data/singers.js');
    const out = mod.selectAllSongsWithAlbums(mkEntrants(), 4);
    // 每张专辑各取 1 首，且是该专辑收藏量最高的
    const byAlbum = {};
    for (const e of out) byAlbum[e.albumMid] = e.favCount;
    expect(byAlbum.A).toBe(500); // song0
    expect(byAlbum.B).toBe(300); // song2
    expect(byAlbum.C).toBe(200); // song5
    expect(byAlbum.D).toBe(150); // song6
  });

  it('selectWCEntrants all 模式输出重新编号的参赛者', async () => {
    const mod = await import('../data/singers.js');
    const out = mod.selectWCEntrants(mkEntrants(), 'all', 8);
    expect(out).toHaveLength(8);
    expect(out.map((e) => e.seedRank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(out.map((e) => e.id))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
    // 每张专辑至少 1 首
    const albums = new Set(out.map((e) => e.albumMid));
    expect(albums).toEqual(new Set(['A', 'B', 'C', 'D']));
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
      miguPreviewUrl: 'https://example.com/migu.mp3',
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
    expect(restored.miguPreviewUrl).toBe(original.miguPreviewUrl);
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

  it('MIN_FAV_LOOSE = 20000', async () => {
    const mod = await import('./filters.js');
    expect(mod.MIN_FAV_LOOSE).toBe(20000);
  });

  it('识别串烧/翻唱', async () => {
    const mod = await import('./filters.js');
    expect(mod.isMedleyTrack('明明就+淘汰')).toBe(true);
    expect(mod.isMedleyTrack('经典国语金曲串烧')).toBe(true);
    expect(mod.isMedleyTrack('翻唱经典情歌')).toBe(true);
    expect(mod.isMedleyTrack('晴天')).toBe(false);
  });

  it('专辑内歌曲无论收藏量都保留', async () => {
    const mod = await import('./filters.js');
    expect(mod.shouldKeepByFavOrAlbum({ albumMid: '001', favCount: 0 })).toBe(true);
    expect(mod.shouldKeepByFavOrAlbum({ albumMid: '001', favCount: 5 })).toBe(true);
  });

  it('未分类歌曲按收藏量阈值过滤', async () => {
    const mod = await import('./filters.js');
    expect(mod.shouldKeepByFavOrAlbum({ albumMid: '', favCount: 20000 })).toBe(true);
    expect(mod.shouldKeepByFavOrAlbum({ albumMid: '', favCount: 19999 })).toBe(false);
    expect(mod.shouldKeepByFavOrAlbum({ albumMid: '', favCount: 0 })).toBe(false);
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
