// 用酷狗 song_search_v2 搜索歌手，取 SingerId
const NAMES = ['张学友', '王菲', '许嵩', '卢广仲', '林宥嘉', '张震岳', '莫文蔚', '蔡健雅', '郭静'];
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.kugou.com/',
};

async function kugouGet(url) {
  const res = await fetch(url, { headers: HEADERS });
  return res.json();
}

for (const name of NAMES) {
  try {
    // 用歌曲搜索接口搜歌手最热门的一首歌，从中提取 SingerId
    const url = `https://songsearch.kugou.com/song_search_v2?keyword=${encodeURIComponent(name)}&page=1&pagesize=3&userid=-1&clientver=&platform=WebFilter`;
    const d = await kugouGet(url);
    const list = d?.data?.lists || [];
    if (list.length > 0) {
      // 取第一首歌的 SingerId 和 SingerName
      const top = list[0];
      console.log(`${name}\tSingerId=${top.SingerId}\t"${top.SingerName}"\t(top song: "${top.SongName}")`);
      // 也显示其他候选
      for (let i = 1; i < Math.min(3, list.length); i++) {
        console.log(`  alt[${i}]\tSingerId=${list[i].SingerId}\t"${list[i].SingerName}"\t"${list[i].SongName}"`);
      }
    } else {
      console.log(`${name}\t<none>\t(no result)`);
    }
  } catch (e) {
    console.log(`${name}\t<err>\t${e.message}`);
  }
  await new Promise(r => setTimeout(r, 400));
}
