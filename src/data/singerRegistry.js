// src/data/singerRegistry.js — 歌手元数据注册表
// 仅存储元数据，歌曲数据从本地预取 JSON 加载

export const SINGER_REGISTRY = {
  stefanie: {
    name: '孙燕姿',
    nameEn: 'SUN',
    singermid: '001pWERg3vFgg8',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000001pWERg3vFgg8.jpg',
  },
  jj: {
    name: '林俊杰',
    nameEn: 'JJ',
    singermid: '001BLpXF2DyJe2',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000001BLpXF2DyJe2.jpg',
  },
  jay: {
    name: '周杰伦',
    nameEn: 'JAY',
    singermid: '0025NhlN2yWrP4',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M0000025NhlN2yWrP4.jpg',
  },
  jolin: {
    name: '蔡依林',
    nameEn: 'JOLIN',
    singermid: '0027pdHE4STooO',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M0000027pdHE4STooO.jpg',
  },
  david: {
    name: '陶喆',
    nameEn: 'DAVID',
    singermid: '002cK0F12szD9T',
    bracketSize: 128,
    photo: 'https://y.gtimg.cn/music/photo_new/T001R300x300M000002cK0F12szD9T.jpg',
  },
};

// 歌手列表 (保持顺序)
export const SINGER_LIST = Object.keys(SINGER_REGISTRY);
