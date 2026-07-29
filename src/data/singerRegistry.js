// src/data/singerRegistry.js — 歌手元数据注册表
// 仅存储元数据，歌曲数据从本地预取 JSON 加载

export const SINGER_REGISTRY = {
  // ===== 男歌手：周王陶林 + 方大同 + 陈奕迅 + 五月天 + 李荣浩 =====
  jay: {
    name: '周杰伦',
    nameEn: 'JAY',
    singermid: '0025NhlN2yWrP4',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M0000025NhlN2yWrP4.jpg',
  },
  leehom: {
    name: '王力宏',
    nameEn: 'LEEHOM',
    singermid: '001JDzPT3JdvqK',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000001JDzPT3JdvqK.jpg',
  },
  david: {
    name: '陶喆',
    nameEn: 'DAVID',
    singermid: '002cK0F12szD9T',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000002cK0F12szD9T.jpg',
  },
  jj: {
    name: '林俊杰',
    nameEn: 'JJ',
    singermid: '001BLpXF2DyJe2',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000001BLpXF2DyJe2.jpg',
  },
  khalil: {
    name: '方大同',
    nameEn: 'KHALIL',
    singermid: '003zHcYF44FVEV',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000003zHcYF44FVEV.jpg',
  },
  eason: {
    name: '陈奕迅',
    nameEn: 'EASON',
    singermid: '003Nz2So3XXYek',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000003Nz2So3XXYek.jpg',
  },
  mayday: {
    name: '五月天',
    nameEn: 'MAYDAY',
    singermid: '000Sp0Bz4JXH0o',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000000Sp0Bz4JXH0o.jpg',
  },
  lironghao: {
    name: '李荣浩',
    nameEn: 'LI',
    singermid: '000aHmbL2aPXWH',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000000aHmbL2aPXWH.jpg',
  },
  // ===== 女歌手：四大三小 + SHE + 张惠妹 + 邓紫棋 =====
  // 四大天后
  stefanie: {
    name: '孙燕姿',
    nameEn: 'SUN',
    singermid: '001pWERg3vFgg8',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000001pWERg3vFgg8.jpg',
  },
  jolin: {
    name: '蔡依林',
    nameEn: 'JOLIN',
    singermid: '0027pdHE4STooO',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M0000027pdHE4STooO.jpg',
  },
  fish: {
    name: '梁静茹',
    nameEn: 'FISH',
    singermid: '000GGDys0yA0Nk',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000000GGDys0yA0Nk.jpg',
  },
  elva: {
    name: '萧亚轩',
    nameEn: 'ELVA',
    singermid: '002tkdEU4gLVqO',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000002tkdEU4gLVqO.jpg',
  },
  // 三小天后
  angela: {
    name: '张韶涵',
    nameEn: 'ANGELA',
    singermid: '002raUWw3PXdkT',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000002raUWw3PXdkT.jpg',
  },
  cyndi: {
    name: '王心凌',
    nameEn: 'CYNDI',
    singermid: '003RVAdJ1YT5AI',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000003RVAdJ1YT5AI.jpg',
  },
  rainie: {
    name: '杨丞琳',
    nameEn: 'RAINIE',
    singermid: '000ZVS6E1f6f0d',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000000ZVS6E1f6f0d.jpg',
  },
  // 团体 + 其他
  she: {
    name: 'S.H.E',
    nameEn: 'SHE',
    singermid: '003u5H9x1vACGo',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000003u5H9x1vACGo.jpg',
  },
  amei: {
    name: '张惠妹',
    nameEn: 'AMEI',
    singermid: '003JGrNQ3RjelA',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000003JGrNQ3RjelA.jpg',
  },
  gem: {
    name: '邓紫棋',
    nameEn: 'GEM',
    singermid: '001fNHEf1SFEFN',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000001fNHEf1SFEFN.jpg',
  },
  // 实力派女歌手
  sandy: {
    name: '林忆莲',
    nameEn: 'SANDY',
    singermid: '002u0TJy47WWOj',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000002u0TJy47WWOj.jpg',
  },
  lala: {
    name: '徐佳莹',
    nameEn: 'LALA',
    singermid: '002LZVMH0zc8F4',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000002LZVMH0zc8F4.jpg',
  },
};

// 歌手列表 (保持顺序：先男后女)
export const SINGER_LIST = Object.keys(SINGER_REGISTRY);
