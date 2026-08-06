// 手动下载 9 位新歌手的酷狗头像
const SINGERS = [
  { id: 3521, name: '张学友', key: 'jacky' },
  { id: 6076, name: '王菲', key: 'faye' },
  { id: 3047, name: '许嵩', key: 'vae' },
  { id: 1582, name: '卢广仲', key: 'crowd' },
  { id: 1579, name: '林宥嘉', key: 'yoga' },
  { id: 3522, name: '张震岳', key: 'a-yue' },
  { id: 5546, name: '莫文蔚', key: 'karen' },
  { id: 4247, name: '蔡健雅', key: 'tanya' },
  { id: 4663, name: '郭静', key: 'claire' },
];

import { writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const COVER_DIR = join(import.meta.dirname, '..', 'public', 'covers');
await mkdir(COVER_DIR, { recursive: true });

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://www.kugou.com/',
};

for (const s of SINGERS) {
  try {
    // 先查歌手信息获取图片 URL
    const infoRes = await fetch(
      `http://mobilecdn.kugou.com/api/v3/singer/info?singerid=${s.id}`,
      { headers: HEADERS }
    );
    const info = await infoRes.json();
    const imgUrl = info?.data?.imgurl || '';

    // 酷狗图片 URL 格式多样，尝试提取
    let photoUrl = '';
    if (imgUrl) {
      // 直接用原始 URL（通常是 CDN 链接）
      photoUrl = imgUrl.replace('{size}', '400');
    }

    if (!photoUrl) {
      console.log(`${s.name} (${s.id}): 无图片 URL，跳过`);
      continue;
    }

    const destPath = join(COVER_DIR, `singer_${s.id}.jpg`);
    const res = await fetch(photoUrl, { headers: HEADERS });
    if (!res.ok) {
      console.log(`${s.name}: 下载失败 HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buf);
    console.log(`${s.name}: ✅ ${buf.length} bytes → singer_${s.id}.jpg`);
  } catch (e) {
    console.log(`${s.name}: ❌ ${e.message}`);
  }
}
console.log('\n完成！');
