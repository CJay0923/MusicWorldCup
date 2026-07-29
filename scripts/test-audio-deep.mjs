// 深度音频播放链路测试
// 测试实际的音频 URL 是否可播放，以及各级回退是否正常工作
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DATA_DIR = '/workspace/stefanie-song-worldcup-react/public/singerData';
const results = [];
let passCount = 0, failCount = 0, warnCount = 0;

function log(testName, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  results.push({ testName, status, detail });
  if (status === 'PASS') passCount++;
  else if (status === 'FAIL') failCount++;
  else warnCount++;
  console.log(`${icon} ${testName}${detail ? ': ' + detail : ''}`);
}

async function testITunesPreviewUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    return res.ok && res.headers.get('content-type')?.includes('audio');
  } catch {
    // HEAD 可能被拒绝，尝试 GET range
    try {
      const res = await fetch(url, {
        headers: { Range: 'bytes=0-1023' },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });
      return res.ok && (res.status === 200 || res.status === 206);
    } catch {
      return false;
    }
  }
}

async function testQQMusicJsonp(songmid) {
  const guid = String(Math.floor(Math.random() * 1e10));
  const dataParam = JSON.stringify({
    comm: { ct: 24, cv: 0, uin: '0', format: 'json', platform: '20' },
    req_1: {
      module: 'vkey.GetVkeyServer',
      method: 'CgiGetVkey',
      param: {
        filename: [`C400${songmid}.m4a`],
        guid,
        songmid: [songmid],
        songtype: [0],
        uin: '0',
        loginflag: 1,
        platform: '20',
      },
    },
  });
  const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(dataParam)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const json = await res.json();
    const purl = json?.req_1?.data?.midurlinfo?.[0]?.purl || '';
    if (purl) {
      // 验证 purl 是否真的可访问
      const sip = json?.req_1?.data?.sip?.[0] || 'https://dl.stream.qqmusic.qq.com/';
      const fullUrl = sip + purl;
      try {
        const audioRes = await fetch(fullUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
          redirect: 'follow',
        });
        return { ok: audioRes.ok, reason: audioRes.ok ? '可播放' : `HTTP ${audioRes.status}`, url: fullUrl };
      } catch {
        return { ok: false, reason: 'purl存在但无法访问', url: fullUrl };
      }
    }
    return { ok: false, reason: 'purl为空(VIP/需登录)' };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function testRuntimeITunesSearch(artistName, songName) {
  try {
    const term = encodeURIComponent(`${songName} ${artistName}`);
    const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=10&country=cn`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const json = await res.json();
    const matched = json.results?.find(t => t.previewUrl);
    if (matched) {
      // 验证 preview URL 可访问
      const audioOk = await testITunesPreviewUrl(matched.previewUrl);
      return { ok: audioOk, reason: audioOk ? '可播放' : 'preview URL不可访问', url: matched.previewUrl };
    }
    return { ok: false, reason: '搜索无结果或无previewUrl' };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function main() {
  console.log('🎵 深度音频播放链路测试开始\n');
  console.log(`时间: ${new Date().toISOString()}\n`);

  const files = await readdir(DATA_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');

  // ========== 1. iTunes 预取 URL 有效性测试（抽样） ==========
  console.log('========== 1. iTunes 预取 URL 有效性测试 ==========\n');
  let itunesTotalTested = 0, itunesTotalOk = 0;

  for (const filename of jsonFiles) {
    const raw = JSON.parse(await readFile(join(DATA_DIR, filename), 'utf-8'));
    const singerName = raw.singerName;
    const withPreview = raw.entrants.filter(e => e.itunesPreviewUrl);
    
    if (withPreview.length === 0) {
      log(`${singerName}: iTunes 预取 URL`, 'WARN', '0首有预取URL (依赖运行时搜索)');
      continue;
    }

    // 抽样测试 3 首
    const sample = withPreview.slice(0, 3);
    let okCount = 0;
    for (const song of sample) {
      const ok = await testITunesPreviewUrl(song.itunesPreviewUrl);
      if (ok) okCount++;
      itunesTotalTested++;
      if (ok) itunesTotalOk++;
    }
    const rate = (okCount / sample.length * 100).toFixed(0);
    log(`${singerName}: iTunes 预取 URL 有效性`, okCount === sample.length ? 'PASS' : okCount > 0 ? 'WARN' : 'FAIL',
      `${okCount}/${sample.length} 可访问 (${rate}%)`);
  }

  console.log(`\n  📊 iTunes 预取 URL 总有效率: ${itunesTotalOk}/${itunesTotalTested} (${(itunesTotalOk/itunesTotalTested*100).toFixed(1)}%)\n`);

  // ========== 2. QQ Music JSONP 回退测试（抽样） ==========
  console.log('========== 2. QQ Music JSONP 回退测试 ==========\n');
  
  // 测试有 itunesPreviewUrl 和没有的各 5 首
  const stefanieData = JSON.parse(await readFile(join(DATA_DIR, 'stefanie.json'), 'utf-8'));
  const withItunes = stefanieData.entrants.filter(e => e.itunesPreviewUrl && e.songmid).slice(0, 3);
  const withoutItunes = stefanieData.entrants.filter(e => !e.itunesPreviewUrl && e.songmid).slice(0, 5);
  
  let qqTotalTested = 0, qqTotalOk = 0;

  console.log('  --- 有 iTunes 预取的歌（测试 QQ 回退是否正常工作）---');
  for (const song of withItunes) {
    const result = await testQQMusicJsonp(song.songmid);
    qqTotalTested++;
    if (result.ok) qqTotalOk++;
    log(`QQ回退(有iTunes): "${song.name}"`, result.ok ? 'PASS' : 'WARN', result.reason);
  }

  console.log('\n  --- 无 iTunes 预取的歌（测试 QQ 作为主音源）---');
  for (const song of withoutItunes) {
    const result = await testQQMusicJsonp(song.songmid);
    qqTotalTested++;
    if (result.ok) qqTotalOk++;
    log(`QQ主音源(无iTunes): "${song.name}"`, result.ok ? 'PASS' : 'WARN', result.reason);
  }

  console.log(`\n  📊 QQ Music JSONP 总有效率: ${qqTotalOk}/${qqTotalTested} (${(qqTotalOk/qqTotalTested*100).toFixed(1)}%)\n`);

  // ========== 3. 运行时 iTunes 搜索测试（无预取的歌） ==========
  console.log('========== 3. 运行时 iTunes 搜索测试 ==========\n');
  
  const withoutItunesAll = stefanieData.entrants.filter(e => !e.itunesPreviewUrl).slice(0, 5);
  let searchTotalTested = 0, searchTotalOk = 0;

  for (const song of withoutItunesAll) {
    const result = await testRuntimeITunesSearch('孙燕姿', song.name);
    searchTotalTested++;
    if (result.ok) searchTotalOk++;
    log(`运行时搜索: "${song.name}"`, result.ok ? 'PASS' : 'WARN', result.reason);
  }

  console.log(`\n  📊 运行时 iTunes 搜索有效率: ${searchTotalOk}/${searchTotalTested} (${(searchTotalOk/searchTotalTested*100).toFixed(1)}%)\n`);

  // ========== 4. 完整播放链路模拟测试 ==========
  console.log('========== 4. 完整播放链路模拟测试 ==========\n');
  console.log('  模拟 useAudioPlayer.js 的播放逻辑：\n');

  // 场景 A: 有 itunesPreviewUrl → 直接播放
  const songA = stefanieData.entrants.find(e => e.itunesPreviewUrl);
  if (songA) {
    const ok = await testITunesPreviewUrl(songA.itunesPreviewUrl);
    log(`场景A: 有预取URL直接播放 "${songA.name}"`, ok ? 'PASS' : 'FAIL',
      ok ? 'iTunes预取URL可直接播放' : 'iTunes预取URL不可访问,需回退');
    if (!ok && songA.songmid) {
      // 测试回退到 QQ Music
      const qqResult = await testQQMusicJsonp(songA.songmid);
      log(`场景A回退: →QQ Music "${songA.name}"`, qqResult.ok ? 'PASS' : 'WARN', qqResult.reason);
    }
  }

  // 场景 B: 无 itunesPreviewUrl → 运行时搜索 iTunes
  const songB = stefanieData.entrants.find(e => !e.itunesPreviewUrl);
  if (songB) {
    const searchResult = await testRuntimeITunesSearch('孙燕姿', songB.name);
    log(`场景B: 运行时搜索 "${songB.name}"`, searchResult.ok ? 'PASS' : 'WARN',
      searchResult.ok ? '搜索到并可播放' : `搜索失败: ${searchResult.reason}`);
    if (!searchResult.ok && songB.songmid) {
      // 测试回退到 QQ Music
      const qqResult = await testQQMusicJsonp(songB.songmid);
      log(`场景B回退: →QQ Music "${songB.name}"`, qqResult.ok ? 'PASS' : 'WARN', qqResult.reason);
    }
  }

  // 场景 C: 无 itunesPreviewUrl 且无 songmid → 打开搜索页（最差情况）
  const songC = stefanieData.entrants.find(e => !e.itunesPreviewUrl && !e.songmid);
  if (songC) {
    log(`场景C: 全部失败 →打开搜索页 "${songC.name}"`, 'WARN', '将打开QQ音乐搜索页');
  } else {
    log(`场景C: 全部失败 →打开搜索页`, 'PASS', '所有歌曲都有 songmid, 不会到达此场景');
  }

  // ========== 5. 各歌手覆盖率统计 ==========
  console.log('\n========== 5. 各歌手试听覆盖率统计 ==========\n');
  console.log('歌手\t\t总歌曲\tiTunes预取\tQQ可用(估)\t总覆盖率(估)');
  console.log('---\t\t---\t---\t\t---\t\t---');

  let grandTotal = 0, grandItunes = 0;

  for (const filename of jsonFiles.sort()) {
    const raw = JSON.parse(await readFile(join(DATA_DIR, filename), 'utf-8'));
    const songs = raw.entrants || [];
    const hasItunes = songs.filter(s => s.itunesPreviewUrl).length;
    const hasSongmid = songs.filter(s => s.songmid).length;
    const noItunesHasSongmid = songs.filter(s => !s.itunesPreviewUrl && s.songmid).length;
    // QQ Music 估计可用率约 60-70%（VIP歌曲不可用）
    const estQQ = Math.round(noItunesHasSongmid * 0.65);
    const estTotal = hasItunes + estQQ;
    const rate = songs.length > 0 ? (estTotal / songs.length * 100).toFixed(0) : '0';
    
    console.log(`${raw.singerName}\t\t${songs.length}\t${hasItunes}\t\t${estQQ}\t\t${rate}%`);
    grandTotal += songs.length;
    grandItunes += hasItunes;
  }

  console.log(`---\t\t---\t---\t\t---\t\t---`);
  console.log(`合计\t\t${grandTotal}\t${grandItunes}\t\t~${Math.round((grandTotal - grandItunes) * 0.65)}\t\t~${((grandItunes + Math.round((grandTotal - grandItunes) * 0.65)) / grandTotal * 100).toFixed(0)}%`);

  // ========== 汇总 ==========
  console.log('\n========== 深度测试汇总 ==========');
  console.log(`✅ 通过: ${passCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⚠️ 警告: ${warnCount}`);
  console.log(`总计: ${results.length}`);

  const issues = results.filter(r => r.status !== 'PASS');
  if (issues.length > 0) {
    console.log('\n========== 不符预期的问题 ==========');
    for (const issue of issues) {
      console.log(`  [${issue.status}] ${issue.testName}: ${issue.detail}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('测试执行出错:', err);
  process.exit(1);
});
