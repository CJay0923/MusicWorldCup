// scripts/fetch-migu-previews.js
// 为所有歌手的「iTunes 未覆盖」歌曲预匹配咪咕音乐整曲试听 URL
//
// 背景：iTunes 预取覆盖约 79%（3264/4118），粤语/台语/冷门歌缺口大。
// 咪咕音乐（MiguMusicApi 增强版）可返回免费 CDN 整曲 MP3：
//   - freetyst.nf.migu.cn 免费试听 CDN，base 路径（去掉 Tim/Key/msisdn 等签名参数）稳定可长期访问
//   - 无需登录/VIP，国内可达
//
// 流程：
//   1. 处理所有尚未有 miguPreviewUrl 的歌曲（含 iTunes 已覆盖的，最大化全曲覆盖）
//   2. searchSong(`${song.name} ${singerName}`) → 用 baseKey(名称)+歌手匹配
//   3. getUrlH5V24(contentId, 'LQ') 拿 URL → 去签名参数取 base 路径
//   4. HEAD 验证 URL 可访问 → 回填 miguPreviewUrl
//
// 输出：在 singerData/{id}.json 的每首 entrant 上追加 miguPreviewUrl
//
// 支持 CLI 歌手过滤：node scripts/fetch-migu-previews.js eason sandy

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';
import { searchSong, getUrlH5V24 } from 'migu-api-enhanced';
import { baseKey } from '../src/utils/text.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'src', 'data', 'singerData');

// 简繁转换器
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

// 与 fetch-itunes-previews.js 保持完全一致的归一逻辑
const VARIANT_WORDS = [
  ['印地安', '印第安'], ['长髮', '长发'], ['公佈', '公布'], ['山峯', '山峰'],
  ['並且', '并且'], ['夜裏', '夜里'], ['象徵', '象征'], ['聽著', '听着'],
  ['佔據', '占据'], ['唸唸', '念念'], ['餵養', '喂养'], ['潮溼', '潮湿'],
  ['冷凍', '冷冻'], ['卡農', '卡农'],
  ['甚麼', '什么'], ['甚么', '什么'], ['麼', '么'], ['幺', '么'],
  ['後', '后'], ['爲', '为'], ['凂', '美'], ['化粧', '化妆'], ['粧', '妆'],
];
function normalizeVariants(s) {
  let out = String(s || '');
  for (const [from, to] of VARIANT_WORDS) out = out.split(from).join(to);
  return out;
}
// 统一归一：转简体 → 归一异体词 → baseKey
function norm(s) {
  return baseKey(normalizeVariants(t2s(String(s || ''))));
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// HEAD 验证 base URL 是否仍可访问（audio/mpeg）
const verifiedCache = new Map();
async function headVerify(url) {
  if (verifiedCache.has(url)) return verifiedCache.get(url);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    const ok = res.ok && (res.headers.get('content-type') || '').includes('audio');
    verifiedCache.set(url, ok);
    return ok;
  } catch {
    verifiedCache.set(url, false);
    return false;
  }
}

// 搜索并拿 base 播放 URL
async function fetchMiguBaseUrl(songName, singerName) {
  const targetKey = norm(songName);
  const singerKey = norm(singerName);

  for (let page = 1; page <= 3; page++) {
    let items = [];
    try {
      const r = await searchSong(`${songName} ${singerName}`, page);
      items = r?.data?.items || [];
    } catch (e) {
      console.log(`    ⚠ search err: ${e.message}`);
      await sleep(500);
      continue;
    }
    if (!items.length) break;

    // 候选评分：名称完全匹配(100) + 歌手匹配加分(20)
    let best = null;
    let bestScore = -1;
    for (const it of items) {
      const sg = it?.song;
      if (!sg?.contentId) continue;
      let score = 0;
      if (norm(sg.songName) === targetKey) score += 100;
      else if (norm(sg.songName).includes(targetKey) || targetKey.includes(norm(sg.songName))) score += 50;
      else continue; // 名称不匹配直接跳过
      // 歌手加分
      const singers = (sg.singerList || []).map((s) => norm(s.name || ''));
      if (singers.some((s) => s === singerKey)) score += 20;
      if (score > bestScore) { bestScore = score; best = sg; }
    }
    if (!best) break;

    // 拿 URL
    try {
      const u = await getUrlH5V24(String(best.contentId), 'LQ');
      const fullUrl = u?.data?.url || '';
      if (!fullUrl) {
        console.log(`    ⚠ 无 URL (code=${u?.code} info=${u?.info || ''}) → ${best.songName}`);
        return '';
      }
      const base = fullUrl.split('?')[0];
      if (await headVerify(base)) return base;
      console.log(`    ⚠ URL 不可访问 → ${best.songName}`);
      return '';
    } catch (e) {
      console.log(`    ⚠ url err: ${e.message}`);
      return '';
    }
  }
  return '';
}

// ---------- 主流程 ----------

const ALL_SINGERS = ['stefanie', 'jj', 'jay', 'jolin', 'david', 'she', 'eason', 'amei', 'angela', 'cyndi', 'elva', 'fish', 'gem', 'khalil', 'lala', 'leehom', 'lironghao', 'mayday', 'rainie', 'sandy'];

const SINGERS = process.argv.slice(2).filter(Boolean).length
  ? process.argv.slice(2).filter(Boolean)
  : ALL_SINGERS;

async function main() {
  console.log('🎵 开始预取咪咕整曲 URL（处理全部歌曲，最大化全曲覆盖）...\n');
  console.log(`  本次处理 ${SINGERS.length} 位歌手: ${SINGERS.join(', ')}\n`);

  let totalCandidates = 0;
  let totalMatched = 0;

  for (const singerId of SINGERS) {
    const jsonPath = join(DATA_DIR, `${singerId}.json`);
    const raw = JSON.parse(await readFile(jsonPath, 'utf-8'));
    const singerName = raw.singerName;

    // 处理尚未有 miguPreviewUrl 的歌曲（已命中的跳过，避免重复请求）
    const candidates = raw.entrants.filter((e) => !e.miguPreviewUrl);
    const alreadyDone = raw.entrants.length - candidates.length;
    console.log(`\n📱 ${singerName} (${singerId}): 待处理 ${candidates.length} 首 (已覆盖 ${alreadyDone})`);

    let matched = 0;
    for (let i = 0; i < candidates.length; i++) {
      const e = candidates[i];
      const url = await fetchMiguBaseUrl(e.name, singerName);
      if (url) {
        e.miguPreviewUrl = url;
        matched++;
        totalMatched++;
      } else {
        e.miguPreviewUrl = e.miguPreviewUrl || '';
      }
      totalCandidates++;

      if ((i + 1) % 10 === 0 || i === candidates.length - 1) {
        console.log(`  ...${i + 1}/${candidates.length} (命中 ${matched})`);
      }
      await sleep(150); // 限流
    }

    await writeFile(jsonPath, JSON.stringify(raw));
    console.log(`  ✅ ${singerName}: 命中 ${matched}/${candidates.length}，已保存`);
    console.log(`  未命中示例: ${candidates.filter((c) => !c.miguPreviewUrl).slice(0, 5).map((c) => c.name).join(', ')}`);
  }

  console.log(`\n✅ 全部完成！总命中 ${totalMatched}/${totalCandidates} (${((totalMatched / totalCandidates) * 100).toFixed(1)}%)`);
}

main().catch((err) => {
  console.error('💥 失败:', err);
  process.exit(1);
});
