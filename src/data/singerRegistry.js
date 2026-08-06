// src/data/singerRegistry.js — 歌手元数据注册表
// 仅存储元数据，歌曲数据从本地预取 JSON 加载
// 歌手头像改走同源托管（public/covers/），不再依赖 QQ 音乐 CDN
//
// 排序：按华语乐坛国民度/热门度降序（四大天王/天后 > 流量唱作 > 实力派）

export const SINGER_REGISTRY = {
  // ===== 天王天后级（国民度天花板） =====
  jay: {
    name: '周杰伦',
    nameEn: 'JAY',
    singermid: '0025NhlN2yWrP4',
    bracketSize: 128,
    photo: './singers/singer_0025NhlN2yWrP4.jpg',
  },
  jacky: {
    name: '张学友',
    nameEn: 'JACKY',
    singermid: '3521',
    bracketSize: 128,
    photo: './covers/singer_3521.jpg',
  },
  faye: {
    name: '王菲',
    nameEn: 'FAYE',
    singermid: '6076',
    bracketSize: 128,
    photo: './covers/singer_6076.jpg',
  },
  eason: {
    name: '陈奕迅',
    nameEn: 'EASON',
    singermid: '003Nz2So3XXYek',
    bracketSize: 128,
    photo: './singers/singer_003Nz2So3XXYek.jpg',
  },

  // ===== 男歌手：王力宏 + 陶喆 + 林俊杰 + 方大同 + 李荣浩 =====
  leehom: {
    name: '王力宏',
    nameEn: 'LEEHOM',
    singermid: '001JDzPT3JdvqK',
    bracketSize: 128,
    photo: './singers/singer_001JDzPT3JdvqK.jpg',
  },
  david: {
    name: '陶喆',
    nameEn: 'DAVID',
    singermid: '002cK0F12szD9T',
    bracketSize: 128,
    photo: './singers/singer_002cK0F12szD9T.jpg',
  },
  jj: {
    name: '林俊杰',
    nameEn: 'JJ',
    singermid: '001BLpXF2DyJe2',
    bracketSize: 128,
    photo: './singers/singer_001BLpXF2DyJe2.jpg',
  },
  khalil: {
    name: '方大同',
    nameEn: 'KHALIL',
    singermid: '003zHcYF44FVEV',
    bracketSize: 128,
    photo: './singers/singer_003zHcYF44FVEV.jpg',
  },
  lironghao: {
    name: '李荣浩',
    nameEn: 'LI',
    singermid: '000aHmbL2aPXWH',
    bracketSize: 128,
    photo: './singers/singer_000aHmbL2aPXWH.jpg',
  },
  // 团体
  mayday: {
    name: '五月天',
    nameEn: 'MAYDAY',
    singermid: '000Sp0Bz4JXH0o',
    bracketSize: 128,
    photo: './singers/singer_000Sp0Bz4JXH0o.jpg',
  },

  // ===== 唱作人 / 实力派男声 =====
  vae: {
    name: '许嵩',
    nameEn: 'VAE',
    singermid: '3047',
    bracketSize: 128,
    photo: './covers/singer_3047.jpg',
  },
  yoga: {
    name: '林宥嘉',
    nameEn: 'YOGA',
    singermid: '1579',
    bracketSize: 128,
    photo: './covers/singer_1579.jpg',
  },
  'a-yue': {
    name: '张震岳',
    nameEn: 'A-YUE',
    singermid: '3522',
    bracketSize: 128,
    photo: './covers/singer_3522.jpg',
  },
  crowd: {
    name: '卢广仲',
    nameEn: 'CROWD',
    singermid: '1582',
    bracketSize: 128,
    photo: './covers/singer_1582.jpg',
  },

  // ===== 女歌手：四大三小 + SHE + 张惠妹 + 邓紫棋 =====
  // 四大天后
  stefanie: {
    name: '孙燕姿',
    nameEn: 'SUN',
    singermid: '001pWERg3vFgg8',
    bracketSize: 128,
    photo: './singers/singer_001pWERg3vFgg8.jpg',
  },
  jolin: {
    name: '蔡依林',
    nameEn: 'JOLIN',
    singermid: '0027pdHE4STooO',
    bracketSize: 128,
    photo: './singers/singer_0027pdHE4STooO.jpg',
  },
  fish: {
    name: '梁静茹',
    nameEn: 'FISH',
    singermid: '000GGDys0yA0Nk',
    bracketSize: 128,
    photo: './singers/singer_000GGDys0yA0Nk.jpg',
  },
  elva: {
    name: '萧亚轩',
    nameEn: 'ELVA',
    singermid: '002tkdEU4gLVqO',
    bracketSize: 128,
    photo: './singers/singer_002tkdEU4gLVqO.jpg',
  },
  // 三小天后
  angela: {
    name: '张韶涵',
    nameEn: 'ANGELA',
    singermid: '002raUWw3PXdkT',
    bracketSize: 128,
    photo: './singers/singer_002raUWw3PXdkT.jpg',
  },
  cyndi: {
    name: '王心凌',
    nameEn: 'CYNDI',
    singermid: '003RVAdJ1YT5AI',
    bracketSize: 128,
    photo: './singers/singer_003RVAdJ1YT5AI.jpg',
  },
  rainie: {
    name: '杨丞琳',
    nameEn: 'RAINIE',
    singermid: '000ZVS6E1f6f0d',
    bracketSize: 128,
    photo: './singers/singer_000ZVS6E1f6f0d.jpg',
  },
  // 团体 + 其他
  she: {
    name: 'S.H.E',
    nameEn: 'SHE',
    singermid: '003u5H9x1vACGo',
    bracketSize: 128,
    photo: './singers/singer_003u5H9x1vACGo.jpg',
  },
  amei: {
    name: '张惠妹',
    nameEn: 'AMEI',
    singermid: '003JGrNQ3RjelA',
    bracketSize: 128,
    photo: './singers/singer_003JGrNQ3RjelA.jpg',
  },
  gem: {
    name: '邓紫棋',
    nameEn: 'GEM',
    singermid: '001fNHEf1SFEFN',
    bracketSize: 128,
    photo: './singers/singer_001fNHEf1SFEFN.jpg',
  },
  // 实力派女歌手
  karen: {
    name: '莫文蔚',
    nameEn: 'KAREN',
    singermid: '5546',
    bracketSize: 128,
    photo: './covers/singer_5546.jpg',
  },
  tanya: {
    name: '蔡健雅',
    nameEn: 'TANYA',
    singermid: '4247',
    bracketSize: 128,
    photo: './covers/singer_4247.jpg',
  },
  sandy: {
    name: '林忆莲',
    nameEn: 'SANDY',
    singermid: '002u0TJy47WWOj',
    bracketSize: 128,
    photo: './singers/singer_002u0TJy47WWOj.jpg',
  },
  claire: {
    name: '郭静',
    nameEn: 'CLAIRE',
    singermid: '4663',
    bracketSize: 128,
    photo: './covers/singer_4663.jpg',
  },
  lala: {
    name: '徐佳莹',
    nameEn: 'LALA',
    singermid: '002LZVMH0zc8F4',
    bracketSize: 128,
    photo: './singers/singer_002LZVMH0zc8F4.jpg',
  },
};

// 歌手列表 (保持顺序：热门度降序)
export const SINGER_LIST = Object.keys(SINGER_REGISTRY);
