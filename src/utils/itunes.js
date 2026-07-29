// itunes.js
// iTunes Search API 工具 — 作为试听数据源（运行时回退）
// 无需密钥，浏览器直连，天然支持 CORS（带 JSONP 降级）
//
// 照搬 music-cup api.js 的策略：
//   1. searchArtists(artistName) → 拿到 iTunes artistId
//   2. lookup?id=artistId&entity=song → 拉取该歌手全部歌曲
//   3. 用 baseKey(trackName) === baseKey(songName) 精确匹配
//   4. 只在确认 artistId 匹配时才取结果，避免匹配到错误歌手
//
// 注：大部分歌曲已在预取阶段（fetch-itunes-previews.js）匹配完成，
//     此函数仅作为运行时回退，覆盖预取时遗漏的歌曲。

import { baseKey } from './text.js';

const ITUNES_BASE = 'https://itunes.apple.com';
const PREVIEW_CACHE = new Map(); // 同一会话内重复搜索免走网络

// JSONP 降级：fetch 被 CORS/网络挡住时使用
let jsonpMode = false;
let cbSeq = 0;

function jsonp(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const cb = '__mcup_cb_' + ++cbSeq;
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, timeout);
    function cleanup() {
      clearTimeout(timer);
      delete window[cb];
      script.remove();
    }
    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('jsonp failed'));
    };
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.head.appendChild(script);
  });
}

async function get(url) {
  if (!jsonpMode) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      try {
        const response = await fetch(url, { signal: ctrl.signal });
        if (!response.ok) throw new Error('http ' + response.status);
        return await response.json();
      } finally {
        clearTimeout(timer);
      }
    } catch {
      jsonpMode = true;
    }
  }
  return jsonp(url);
}

// 简繁转换：轻量级字符映射（避免打包 opencc-js 字典文件）
// 覆盖常见繁简差异字符，用于运行时回退匹配
// 注：预取阶段（fetch-itunes-previews.js）已用完整 opencc-js 做精确匹配
const T2S_CHARS = {
  '孫':'孙','傑':'杰','倫':'伦','依':'依','姿':'姿','燕':'燕','蔡':'蔡','林':'林','周':'周',
  '陳':'陈','劉':'刘','黃':'黄','張':'张','吳':'吴','楊':'杨','趙':'赵','王':'王','李':'李',
  '儀':'仪','鳳':'凤','龍':'龙','華':'华','國':'国','學':'学','東':'东','西':'西','南':'南','北':'北',
  '開':'开','關':'关','門':'门','聽':'听','說':'说','讀':'读','寫':'写','見':'见','視':'视','覺':'觉',
  '樂':'乐','聲':'声','場':'场','館':'馆','廳':'厅','會':'会','員':'员','動':'动','態':'态',
  '實':'实','驗':'验','證':'证','確':'确','認':'认','識':'识','語':'语','言':'言','話':'话',
  '與':'与','給':'给','為':'为','來':'来','發':'发','達':'达','經':'经','過':'过','現':'现',
  '當':'当','時':'时','間':'间','個':'个','們':'们','這':'这','那':'那','裡':'里','還':'还',
  '應':'应','該':'该','沒':'没','有':'有','無':'无','不':'不','是':'是','的':'的','了':'了',
  '協':'协','議':'议','結':'结','果':'果','點':'点','電':'电','腦':'脑','網':'网','絡':'络',
  '線':'线','路':'路','車':'车','機':'机','飛':'飞','船':'船','島':'岛','嶼':'屿','灣':'湾',
  '海':'海','山':'山','水':'水','火':'火','風':'风','雲':'云','雨':'雨','雪':'雪','月':'月',
  '陽':'阳','光':'光','星':'星','天':'天','空':'空','地':'地','夢':'梦','愛':'爱','心':'心',
  '情':'情','戀':'恋','吻':'吻','淚':'泪','笑':'笑','哭':'哭','痛':'痛','快':'快','樂':'乐',
  '傷':'伤','悲':'悲','歡':'欢','喜':'喜','怒':'怒','驚':'惊','怕':'怕','勇':'勇','強':'强',
  '弱':'弱','美':'美','麗':'丽','醜':'丑','善':'善','惡':'恶','真':'真','假':'假','善':'善',
  '聖':'圣','神':'神','仙':'仙','鬼':'鬼','魔':'魔','怪':'怪','妖':'妖','精':'精','靈':'灵',
  '藝':'艺','術':'术','音':'音','畫':'画','書':'书','詩':'诗','詞':'词','曲':'曲','舞':'舞',
  '劇':'剧','戲':'戏','演':'演','唱':'唱','奏':'奏','彈':'弹','琴':'琴','弦':'弦','鼓':'鼓',
  '鐘':'钟','鈴':'铃','聲':'声','響':'响','韻':'韵','律':'律','調':'调','節':'节','拍':'拍',
  '藍':'蓝','綠':'绿','紅':'红','黃':'黄','紫':'紫','粉':'粉','白':'白','黑':'黑','灰':'灰',
  '銀':'银','金':'金','鐵':'铁','銅':'铜','錫':'锡','鉛':'铅','鋁':'铝','鋼':'钢',
  '樹':'树','林':'林','森':'森','花':'花','草':'草','葉':'叶','果':'果','實':'实','種':'种',
  '鳥':'鸟','魚':'鱼','蟲':'虫','獸':'兽','馬':'马','牛':'牛','羊':'羊','豬':'猪','狗':'狗',
  '貓':'猫','雞':'鸡','鴨':'鸭','鵝':'鹅','龍':'龙','蛇':'蛇','鼠':'鼠','兔':'兔','虎':'虎',
  '鄉':'乡','鎮':'镇','村':'村','城':'城','市':'市','街':'街','路':'路','橋':'桥','河':'河',
  '湖':'湖','江':'江','溪':'溪','泉':'泉','瀑':'瀑','布':'布','沙':'沙','石':'石','岩':'岩',
  '礦':'矿','寶':'宝','玉':'玉','珠':'珠','鑽':'钻','銀':'银','鏡':'镜','鎖':'锁','針':'针',
  '釘':'钉','刀':'刀','劍':'剑','槍':'枪','炮':'炮','箭':'箭','弓':'弓','盾':'盾','甲':'甲',
  '盔':'盔','帽':'帽','衣':'衣','裙':'裙','褲':'裤','鞋':'鞋','襪':'袜','巾':'巾','帶':'带',
  '環':'环','鏈':'链','墜':'坠','戒':'戒','冠':'冠','冕':'冕','旒':'旒','旗':'旗','幟':'帜',
  '標':'标','記':'记','號':'号','符':'符','碼':'码','字':'字','母':'母','文':'文','句':'句',
  '章':'章','篇':'篇','卷':'卷','冊':'册','頁':'页','本':'本','紙':'纸','筆':'笔','墨':'墨',
  '硯':'砚','印':'印','章':'章','圖':'图','畫':'画','表':'表','格':'格','行':'行','列':'列',
  '陣':'阵','勢':'势','式':'式','型':'型','形':'形','狀':'状','態':'态','樣':'样','貌':'貌',
  '顏':'颜','色':'色','彩':'彩','影':'影','光':'光','暗':'暗','明':'明','亮':'亮','輝':'辉',
  '燦':'灿','爛':'烂','耀':'耀','眩':'眩','盲':'盲','矇':'蒙','瞇':'眯','睁':'睁','眼':'眼',
  '睛':'睛','眉':'眉','鼻':'鼻','嘴':'嘴','唇':'唇','齒':'齿','舌':'舌','耳':'耳','頸':'颈',
  '肩':'肩','臂':'臂','肘':'肘','腕':'腕','掌':'掌','指':'指','胸':'胸','腹':'腹','腰':'腰',
  '背':'背','臀':'臀','腿':'腿','膝':'膝','腳':'脚','膚':'肤','肌':'肌','肉':'肉','骨':'骨',
  '血':'血','脈':'脉','筋':'筋','氣':'气','力':'力','精':'精','神':'神','魂':'魂','魄':'魄',
  '膽':'胆','脾':'脾','胃':'胃','腸':'肠','腎':'肾','肺':'肺','肝':'肝','心':'心','腦':'脑',
  '記':'记','憶':'忆','思':'思','念':'念','想':'想','覺':'觉','悟':'悟','懂':'懂','瞭':'了',
  '解':'解','釋':'释','說':'说','講':'讲','論':'论','議':'议','論':'论','評':'评','判':'判',
  '斷':'断','決':'决','定':'定','擇':'择','選':'选','挑':'挑','揀':'拣','拾':'拾','收':'收',
  '放':'放','拿':'拿','抓':'抓','握':'握','鬆':'松','緊':'紧','開':'开','閉':'闭','關':'关',
  '鎖':'锁','啟':'启','停':'停','止':'止','動':'动','靜':'静','行':'行','走':'走','跑':'跑',
  '跳':'跳','飛':'飞','游':'游','爬':'爬','坐':'坐','站':'站','躺':'躺','睡':'睡','醒':'醒',
  '吃':'吃','喝':'喝','咬':'咬','嚼':'嚼','吞':'吞','吐':'吐','吸':'吸','呼':'呼','氣':'气',
  '味':'味','香':'香','臭':'臭','腥':'腥','甜':'甜','酸':'酸','苦':'苦','辣':'辣','鹹':'咸',
  '淡':'淡','清':'清','濁':'浊','深':'深','淺':'浅','高':'高','低':'低','長':'长','短':'短',
  '寬':'宽','窄':'窄','厚':'厚','薄':'薄','粗':'粗','細':'细','大':'大','小':'小','多':'多',
  '少':'少','重':'重','輕':'轻','硬':'硬','軟':'软','脆':'脆','韌':'韧','剛':'刚','柔':'柔',
  '圓':'圆','方':'方','尖':'尖','鈍':'钝','銳':'锐','利':'利','滑':'滑','澀':'涩','黏':'黏',
  '稠':'稠','稀':'稀','濃':'浓','淡':'淡','飽':'饱','餓':'饿','渴':'渴','倦':'倦','疲':'疲',
  '乏':'乏','困':'困','倦':'倦','怠':'怠','懶':'懒','勤':'勤','奮':'奋','勇':'勇','猛':'猛',
  '烈':'烈','溫':'温','柔':'柔','和':'和','順':'顺','從':'从','聽':'听','話':'话','語':'语',
  '諾':'诺','許':'许','諒':'谅','解':'解','恕':'恕','原':'原','諒':'谅','饒':'饶','赦':'赦',
  '釋':'释','解':'解','放':'放','遣':'遣','送':'送','迎':'迎','接':'接','送':'送','還':'还',
  '返':'返','回':'回','來':'来','去':'去','進':'进','出':'出','上':'上','下':'下','左':'左',
  '右':'右','前':'前','後':'后','內':'内','外':'外','中':'中','旁':'旁','間':'间','邊':'边',
  '處':'处','所':'所','地':'地','方':'方','位':'位','置':'置','點':'点','線':'线','面':'面',
  '體':'体','積':'积','容':'容','量':'量','數':'数','量':'量','質':'质','度':'度','級':'级',
  '階':'阶','層':'层','段':'段','節':'节','次':'次','回':'回','遍':'遍','場':'场','趟':'趟',
  '番':'番','組':'组','群':'群','隊':'队','排':'排','列':'列','行':'行','串':'串','束':'束',
  '把':'把','堆':'堆','疊':'叠','層':'层','卷':'卷','冊':'册','本':'本','篇':'篇','章':'章',
  '節':'节','段':'段','句':'句','字':'字','詞':'词','語':'语','言':'言','話':'话','聲':'声',
  '音':'音','調':'调','曲':'曲','歌':'歌','唱':'唱','奏':'奏','彈':'弹','拉':'拉','吹':'吹',
  '打':'打','敲':'敲','擊':'击','碰':'碰','撞':'撞','衝':'冲','破':'破','碎':'碎','裂':'裂',
  '斷':'断','折':'折','彎':'弯','曲':'曲','直':'直','平':'平','斜':'斜','歪':'歪','正':'正',
  '反':'反','倒':'倒','順':'顺','逆':'逆','對':'对','錯':'错','是':'是','非':'非','真':'真',
  '假':'假','善':'善','惡':'恶','美':'美','醜':'丑','好':'好','壞':'坏','優':'优','劣':'劣',
  '勝':'胜','負':'负','敗':'败','贏':'赢','輸':'输','得':'得','失':'失','成':'成','敗':'败',
  '功':'功','過':'过','罪':'罪','罰':'罚','賞':'赏','褒':'褒','貶':'贬','讚':'赞','譽':'誉',
  '頌':'颂','歌':'歌','頌':'颂','詠':'咏','嘆':'叹','息':'息','哀':'哀','愁':'愁','悲':'悲',
  '歡':'欢','喜':'喜','樂':'乐','怒':'怒','怨':'怨','恨':'恨','悔':'悔','悟':'悟','醒':'醒',
  '醉':'醉','醒':'醒','睡':'睡','夢':'梦','幻':'幻','覺':'觉','想':'想','思':'思','念':'念',
  '憶':'忆','記':'记','忘':'忘','識':'识','認':'认','知':'知','覺':'觉','懂':'懂','瞭':'了',
  '見':'见','看':'看','望':'望','觀':'观','察':'察','視':'视','瞄':'瞄','瞪':'瞪','瞧':'瞧',
  '聽':'听','聞':'闻','嗅':'嗅','嘗':'尝','咬':'咬','摸':'摸','碰':'碰','觸':'触','握':'握',
  '抱':'抱','擁':'拥','親':'亲','吻':'吻','撫':'抚','慰':'慰','護':'护','衛':'卫','守':'守',
  '保':'保','護':'护','防':'防','備':'备','設':'设','置':'置','造':'造','創':'创','建':'建',
  '築':'筑','造':'造','做':'做','幹':'干','活':'活','工':'工','作':'作','業':'业','務':'务',
  '事':'事','職':'职','責':'责','任':'任','務':'务','使':'使','命':'命','令':'令','派':'派',
  '遣':'遣','調':'调','動':'动','移':'移','遷':'迁','搬':'搬','運':'运','輸':'输','送':'送',
  '傳':'传','遞':'递','達':'达','到':'到','至':'至','及':'及','連':'连','接':'接','聯':'联',
  '結':'结','合':'合','聚':'聚','集':'集','散':'散','分':'分','離':'离','別':'别','分':'分',
  '開':'开','關':'关','閉':'闭','合':'合','攏':'拢','聚':'聚','散':'散','離':'离','合':'合',
};

function toSimplified(s) {
  let out = String(s || '');
  for (const [t, simp] of Object.entries(T2S_CHARS)) {
    out = out.split(t).join(simp);
  }
  return out;
}

// 缓存：artistName → { artistId, store }
const ARTIST_CACHE = new Map();

// 照搬 music-cup guessStores
function guessStores(term) {
  if (/[ぁ-ヿ]/.test(term)) return ['jp', 'us'];
  if (/[가-힣]/.test(term)) return ['kr', 'us'];
  if (/[一-鿿]/.test(term)) return ['cn', 'tw', 'us'];
  return ['us'];
}

/**
 * 搜索歌手，拿到 iTunes artistId
 * 照搬 music-cup api.js searchArtists：跨商店搜索，简繁统一后匹配
 */
async function searchArtistId(artistName) {
  if (ARTIST_CACHE.has(artistName)) return ARTIST_CACHE.get(artistName);

  const stores = guessStores(artistName);
  const targetSimp = toSimplified(artistName).toLowerCase();

  for (const store of stores) {
    try {
      const url = `${ITUNES_BASE}/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=10&country=${store}`;
      const data = await get(url);
      if (!data?.results) continue;

      for (const a of data.results) {
        if (!a.artistId) continue;
        const aNameSimp = toSimplified(a.artistName).toLowerCase();
        // 精确匹配或包含匹配（简繁统一后）
        if (aNameSimp === targetSimp ||
            aNameSimp.includes(targetSimp) ||
            targetSimp.includes(aNameSimp)) {
          const result = { artistId: a.artistId, artistName: a.artistName, store };
          ARTIST_CACHE.set(artistName, result);
          return result;
        }
      }
    } catch {
      // 换下一个商店
    }
  }

  ARTIST_CACHE.set(artistName, null);
  return null;
}

/**
 * 直接按「歌名 + 歌手名」搜索 iTunes，快速拿到预览 URL
 * 只需 1-2 次 API 调用（而非拉取歌手全部歌曲的 12+ 次）
 */
async function searchSongDirectly(artistName, songName, artist) {
  const stores = artist ? [artist.store] : guessStores(artistName);
  const songKey = baseKey(toSimplified(songName));
  const targetArtistId = artist?.artistId;
  const targetArtistSimp = artist ? toSimplified(artist.artistName).toLowerCase() : toSimplified(artistName).toLowerCase();

  for (const store of stores) {
    try {
      // 直接搜索歌名+歌手名，只取前 25 条
      const term = encodeURIComponent(`${songName} ${artistName}`);
      const url = `${ITUNES_BASE}/search?term=${term}&entity=song&limit=25&country=${store}`;
      const data = await get(url);
      if (!data?.results) continue;

      for (const t of data.results) {
        if (t.kind !== 'song' || !t.previewUrl) continue;
        // 验证歌手匹配（artistId 或名称）
        if (targetArtistId && t.artistId !== targetArtistId) continue;
        if (!targetArtistId) {
          const tArtistSimp = toSimplified(t.artistName || '').toLowerCase();
          if (tArtistSimp !== targetArtistSimp && !tArtistSimp.includes(targetArtistSimp) && !targetArtistSimp.includes(tArtistSimp)) continue;
        }
        // 验证歌名匹配（baseKey 精确匹配）
        const tKey = baseKey(toSimplified(t.trackName));
        if (tKey === songKey) {
          return {
            preview: t.previewUrl,
            art: t.artworkUrl100 || '',
            album: t.collectionName || '',
          };
        }
      }
    } catch {
      // 换下一个商店
    }
  }
  return null;
}

/**
 * 按歌手+歌名搜索 iTunes 试听预览 URL
 * 策略：先直接搜索歌名（1 次 API 调用），命中即返回；
 *       未命中则搜索歌手全部歌曲再匹配（兜底，分页但限制 3 页）
 * @param {string} artistName - 歌手名
 * @param {string} songName - 歌名
 * @returns {Promise<{preview: string, art: string, album: string} | null>}
 */
export async function findITunesPreview(artistName, songName) {
  const cacheKey = artistName + '|' + songName;
  if (PREVIEW_CACHE.has(cacheKey)) return PREVIEW_CACHE.get(cacheKey);

  let out = null;
  let anyOk = false;

  try {
    // Step 1: 快速直接搜索（1 次 API 调用）
    out = await searchSongDirectly(artistName, songName, null);
    anyOk = true;

    if (!out) {
      // Step 2: 直接搜索未命中 → 搜索歌手拿到 artistId 再精确搜索
      const artist = await searchArtistId(artistName);
      if (artist) {
        out = await searchSongDirectly(artistName, songName, artist);
      }
    }

    if (!out) {
      // Step 3: 仍未命中 → 兜底：lookup 歌手前 3 页歌曲
      const artist = await searchArtistId(artistName);
      if (artist) {
        const store = artist.store || 'us';
        const songKey = baseKey(toSimplified(songName));
        for (let page = 0; page < 3; page++) {
          const offset = page * 200;
          const lookupUrl = `${ITUNES_BASE}/lookup?id=${artist.artistId}&entity=song&limit=200&offset=${offset}&country=${store}`;
          const data = await get(lookupUrl).catch(() => null);
          if (!data?.results) break;
          for (const t of data.results) {
            if (t.kind !== 'song' || !t.previewUrl) continue;
            const tKey = baseKey(toSimplified(t.trackName));
            if (tKey === songKey) {
              out = {
                preview: t.previewUrl,
                art: t.artworkUrl100 || '',
                album: t.collectionName || '',
              };
              break;
            }
          }
          if (out) break;
          if (data.results.length < 200) break;
        }
      }
    }
  } catch {
    // 网络错误等
  }

  // 全部请求失败则不缓存，网络恢复后可重试
  if (out || anyOk) PREVIEW_CACHE.set(cacheKey, out);
  return out;
}
