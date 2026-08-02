# 前端性能审查报告 — 歌曲世界杯（Music World Cup）

> 代码级审查，覆盖：渲染性能 / 资源加载 / 内存管理 / 网络请求 / 代码分割 / 缓存策略 / 关键渲染路径。
> 所有结论均带 `文件:行号` 引用，并给出可落地的改造方案。影响分级：**P0=严重，P1=重要，P2=中等，P3=轻微**。

---

## 〇、总体结论

代码架构整体是健康的：歌手数据已按歌手拆分为独立 chunk（`vite.config.js:14-20` + `useSingerData.js:23` 的 `import.meta.glob`），图片用了 `loading="lazy"`，网络层有 `cancelToken` 防竞态、有 `PREVIEW_CACHE`/`ARTIST_CACHE` 记忆化、搜索做了 300ms 防抖。**但存在 2 个 P0 级渲染瓶颈和若干 P1 级内存/网络/缓存问题**，在“试听播放中”和“夯到拉拖拽”两个高频交互路径上会造成明显卡顿；localStorage 持久化在主流程中做了 O(n) 的全量序列化，规模越大越重。

---

## 一、关键渲染路径（CRP）与初始加载

### 1.1 缺少 CDN preconnect，首屏图片请求被 DNS 阻塞
封面来自 `y.gtimg.cn`（如 `MatchCard.jsx:33`、`index.css` 主题字体无关）。`index.html` 未对 CDN 做 `preconnect`，每个首屏封面的 TCP/TLS 握手都要现建。
- **方案**：在 `index.html` 的 `<head>` 增加
  ```html
  <link rel="preconnect" href="https://y.gtimg.cn" crossorigin>
  <link rel="dns-prefetch" href="https://y.gtimg.cn">
  ```
- 本地 `./covers/album_*.jpg` 同源，无需 preconnect，但建议同样对部署域名做 preconnect。

### 1.2 关键 CSS 95KB 阻塞渲染（轻微，P3）
`src/index.css` 1002 行 → 产物 `style-*.css` 95KB，`cssCodeSplit:false` 单文件、渲染阻塞。对单页应用首屏必需，收益有限，但可：
- 将 `@keyframes` 与首屏无关动画拆分（如 `heroGlow`/`ctaPulse` 仅首页用），或
- 用 `<link rel="preload" as="style">` 提前加载 CSS 并配合 `media="print" onload` 非阻塞技巧（收益小，按需）。

---

## 二、渲染性能（重点）

### 2.0 🔴 P0：`onTimeUpdate` 导致整个 App 每 4 秒重渲染 4 次
`useAudioPlayer.js:83-85`：
```js
const onTimeUpdate = () => { setCurrentTime(audio.currentTime || 0); };
```
`currentTime` 是挂在 App 层的 hook 状态（`App.jsx:245` 的 `audio`）。**只要正在试听，App 组件每 ~250ms 重渲染一次**，连带 `MatchStage`/`MatchCard`/`StartScreen` 等全部子树重算重渲染（这些组件大多未 `React.memo`，见 2.1）。`PreviewModal` 是唯一定需要 `currentTime` 的消费者，却拖着整棵树一起刷新。

- **方案**：把“进度/时间/时长”拆出独立 Context 或独立子组件，只让 `PreviewModal`（及其内部进度条）订阅，App 不再因 tick 重渲染。
  ```jsx
  // 例：用轻量 store，PreviewModal 内部 useSyncExternalStore 订阅
  const useAudioProgress = () => useSyncExternalStore(progressStore.subscribe, progressStore.get);
  ```
  或将 `<audio>` 与进度状态下沉到 `PreviewModal` 内部（弹窗出现时才挂载），App 只负责 `openAudition` 指令。

### 2.1 🔴 P0：夯到拉拖拽时，`pointermove` 触发整树重渲染（含 100+ 卡片）
`RankingScreen.jsx:185-200`：
```js
const handleMove = (e) => {
  ...
  setDragVisual({ ...dragRef.current });   // 每次鼠标移动都 setState
  ...
};
```
`dragVisual` 是 `RankingScreen` 自身 state。拖动时鼠标每移动一帧（~60fps）就 `setState` 一次，**整个组件（所有 tier 行 + 待分类池，可能 100+ 张项目卡片，每张还要 `getItemArt`）全部重新渲染**。这是排名模式最明显的卡顿源。

- **方案**：
  1. ghost 元素用 **ref 直接改 `style.transform`**（`requestAnimationFrame` 合帧），不进 React state；
  2. `pointermove` 只更新 ghost 位置和 `dropTarget` 高亮（用 `setState` 但用 `rAF` 节流到 30fps，且 `dropTarget` 变化范围很小）；
  3. 把拖拽 ghost 移出列表渲染（Portal 到 body），避免与池/行共用一份 state 导致全量重渲染。
- 验证点：`exportImage`（`RankingScreen.jsx:282`）通过 CORS 代理批量拉图，虽慢但属一次性，不在热路径，暂不列入。

### 2.2 P2：`MatchCard` 未 `React.memo`，且父级传内联箭头函数破坏 memo
- `MatchStage.jsx:35,53` 传 `onPick={() => onPick?.(0)}` —— 每次渲染生成新函数引用；
- `MatchCard.jsx:15` 是普通函数组件，未 memo。
结果：`App` 因 2.0 每 4 次/秒重渲染时，`MatchCard` 必重渲染（尽管 props 没变）。比赛舞台只有 2 张卡片，当前影响小，但属于“重渲染雪崩”的结构性隐患。

- **方案**：
  ```jsx
  const MatchCard = React.memo(function MatchCard({...}){...});
  // MatchStage 内用 useCallback 稳定 onPick：
  const onPickLeft = useCallback(() => onPick?.(0), [onPick]);
  ```

### 2.3 P2：App 渲染期大量内联 IIFE 与未记忆的计算
`App.jsx` 中 `rankingCanStart`(`App.jsx:130`)、`progData`(`App.jsx:635`)、`transitionData`(`App.jsx:676`)、`wcBarProps`(`App.jsx:704`)、`canUndo`(`App.jsx:508`) 均为每次渲染重算的 IIFE；`App.jsx:791-799` 在 JSX 内联 `baseSingerData?.entrants?.filter(...)`（对 128+ 条目每渲染过滤）。

- **方案**：这些用 `useMemo` 包裹（依赖对应 state）；`entrants.filter` 提到 `useMemo`。单条开销小，但叠加 2.0 的 4x/sec 重渲染会被放大。

### 2.4 P3：封面 URL 在 `MatchCard` 渲染期重复拼接
`MatchCard.jsx:29-51` 每次渲染都拼 `t062Url/t002Url` 与 `getBestCoverSrc()`。成本低，可 `useMemo` 缓存（依赖 `entrant.songmid/albumMid/picLocal`）。

---

## 三、资源加载（重点）

### 3.0 🔴 P0/P1：歌手数据 chunk 体积过大，整库一次性加载
- 原始 JSON：jj 2.62MB、jay 2.27MB、eason 2.07MB、amei 1.94MB（`src/data/singerData/*.json`）；
- 构建后对应 chunk：`singer-jj-*.js` 2.6MB、`singer-jay-*.js` 2.3MB（磁盘，gzip 后约 300–500KB）。
每个歌手的**全部歌曲元数据（含封面 URL、收藏量、专辑简介等）**在切歌时整包 `import()` 下来（`useSingerData.js:232`），但实际对局只需“封面 + 歌名 + 试听 key”。对 3G/弱网用户首次进入某歌手会有一拍明显的等待。

- **方案（按收益排序）**：
  1. **精简传输结构**：把合约内的冗余字段（如 `songPic`/`pic`/`albumType`/`albumDesc`）在下载脚本里改为可选，对局用不到的字段默认不打包；
  2. **两级加载**：首屏只 `import` 一个“轻索引”（id/name/picLocal/seedRank/songmid）+ 前 32 强整量；其余歌曲在用户真正进入更深轮次或自选模式时再 lazy 加载；
  3. **封面降采样**：`MatchCard` 用 400x400，列表/选择器可用 150x150（已用 `T002R300x300`，可改 `R150x150`），`covers/` 下可并存缩略图；
  4. 评估用 **AVIF/WebP** 替代部分 CDN jpg（需后端/CDN 支持）。

### 3.1 危险配置：`assetsInlineLimit: 100000000`（P1，潜在）
`vite.config.js:10`：
```js
build: { assetsInlineLimit: 100000000, ... }
```
当前没有 `import` 二进制资源（封面都是字符串路径），所以**当前无害**。但一旦接入 `vite-plugin-singlefile`（`package.json` 里已装但未在 `vite.config.js` 启用），该值会把**所有 21 个歌手 JSON（合计 >30MB）+ 封面**全部内联进单个 HTML，产物将大到无法使用，且彻底丧失按歌手的缓存能力。
- **方案**：删掉该行（恢复默认 4KB 内联阈值），或显式设回 `4096`；若未来真要 singlefile，务必先做 3.0 的精简，否则不可行。

### 3.2 封面缓存失效困难（P2，缓存策略）
`covers/album_{mid}.jpg` 文件名**不含内容哈希**（`useSingerData.js:91` 等）。部署到 CDN 后这类文件无法安全设置“永久缓存 + 内容哈希失效”，只能短缓存，否则换图会命中旧图。
- **方案**：下载脚本输出 `album_{mid}.{hash}.jpg` 并在 JSON 里记录哈希，配合 `cache-control: immutable`；或部署层统一加 `?v=` 查询版本号。

---

## 四、内存管理

### 4.0 🔴 P1：歌手数据 `dataCache` 模块级 Map 永不淘汰（内存泄漏）
`useSingerData.js:29`：
```js
const dataCache = new Map(); // singerId -> transformed data
```
切换多名歌手后，每位歌手 ~1–2.6MB 的“已 transform 的 entrant 数组”会一直驻留内存，无上限、无 LRU。长时间游玩/频繁切歌手会持续涨内存。

- **方案**：加简单上限 + LRU（保留最近 3–4 位），或改用 `WeakRef`/定期 `clear`；对“已 transform 的轻量索引”常驻、“全量歌曲”按需重建。

### 4.1 P2：多组缓存 Map 无容量上限
- `useCrossSingerSearch.js:22` `singerDataCache`（跨歌手动态歌手）；
- `itunes.js:17` `PREVIEW_CACHE`、`:171` `ARTIST_CACHE`；
均为模块级、只增不删。会话越长越膨胀（虽然实际受歌手数限制，仍建议设 `Map` 上限或定时清理）。

### 4.2 P2：`useGameState` 与 `useWorldCup` 始终同时挂载
`App.jsx:239,244` 两个 hook 无条件调用，二者各自常驻一份完整 bracket/history 数组，即使当前模式用不到另一个。单份 ~255 槽位 entrant，开销不大，但属于“常驻双份状态”。

- **方案**：把二者收进一个按 mode 选择的自定义 hook（如 `useGame(mode, ...)`），用 `useReducer` + 懒初始化，避免两套状态同时存活。注意 hooks 规则——可用一个始终挂载的容器 hook，内部按 mode 只维护对应状态。

### 4.3 P3：`history` 存全量 entrant 对象
`useGameState.js:217-223` 每次 pick 把完整 `winner/loser` entrant 推入 history（含所有字段）。127 步后对局历史占可观内存，且序列化时（见第五节）放大体积。
- **方案**：history 只存 `{round, match, winnerId, loserId}` + 必要的展示字段（name/pic），渲染冠军之路时再 `byId` 取回。

---

## 五、网络请求

### 5.0 🔴 P1：音频播放 URL 无“会话内”内存缓存（QQ/网易云重复请求）
- iTunes：`itunes.js:17` `PREVIEW_CACHE` 已记忆化 ✅；
- 但 **QQ 音乐** `fetchQQSongUrl`（`api.js:89`）和 **网易云** 音频 URL（`netease.js:109` `fetchNeteaseAudioUrl`，仅 localStorage 7 天缓存，且是“按 nid”不是“按 songmid”）**没有内存级 Map**。对同一首歌反复试听、或“试听失败→回退链”多次尝试时，会重复发起 JSONP/代理请求，既慢又增加第三方限流风险。

- **方案**：在 `api.js` 增加模块级 `const qqUrlCache = new Map()`，命中直接返回；网易云侧把“songmid→nid→url”也进内存 Map（与现有 localStorage 缓存并存）。回退链（`useAudioPlayer.js:186-238`）先查内存缓存再发请求。

### 5.1 P2：`fetchQQSongUrl` 串行两次 JSONP
`api.js:48-85`：先试 `C400.m4a`，失败再试 `M500.mp3`，两次独立 JSONP。可在后端代理可用时一次性拿多格式；纯 JSONP 环境可并行（`Promise.any`）取首个成功，降低首字节时间。

### 5.2 P2：请求未被取消，仅“忽略旧结果”
`useAudioPlayer.js` 用 `cancelTokenRef` 让旧 `openAudition` 结果作废，但**请求本身仍在飞**（JSONP script 已插入 DOM）。快速连点不同歌曲会并发多个 JSONP。
- **方案**：在 `jsonp()`（`api.js:10`/`qqMusic.js:61`）支持传入 `AbortSignal`，超时/取消时 `script.remove()` 真正中断；`useAudioPlayer` 在 `cancelToken++` 时回收在途请求。

### 5.3 P3：CORS 代理依赖第三方且不稳定
`qqMusic.js:20-23` 与 `RankingScreen.jsx:312-316` 用 `corsproxy.io`/`allorigins`/`cors-anywhere`。这些是公共代理，易失效/限速。
- **方案**：坚持“后端代理优先”（`checkBackend` 已做），并把公共代理仅作最后兜底；部署到 Cloudflare Pages 时确保 `/api/*` Functions 可用，前端即可走同域，彻底绕开 CORS。

---

## 六、代码分割

### 6.1 现状良好（肯定）
歌手数据已按歌手拆分为独立 chunk（`vite.config.js:14-20` 的 `manualChunks` + `useSingerData.js:23` `import.meta.glob`），切换歌手零重复传输、浏览器可长期缓存。这是项目里最漂亮的设计。

### 6.2 P2：主 bundle 348KB 含非首屏重型模块
`dist/assets/index-*.js` 348KB，内含 `canvas-confetti`（仅冠军用）、`ChampionShare`/`RankingScreen`/`StartScreen` 等大组件。首次进入经典对局并不需要它们。

- **方案**：
  - `React.lazy(() => import('./components/Confetti.jsx'))` + `Suspense`（Confetti 仅在冠军挂载）；
  - `ChampionShare`/`RankingScreen` 同样懒加载；
  - `canvas-confetti` 改为 `import('canvas-confetti')` 动态引入（只有放烟花时才下载 ~20KB）。
- 收益：首屏 JS 可再降 ~60–100KB，更快到可交互（TTI）。

### 6.3 P3：无路由级分割
单页、无 react-router，影响小；若后续模块化，可进一步按“首页/对局/排名/冠军”拆包。

---

## 七、缓存策略

### 7.0 🔴 P1：localStorage 持久化做了 O(n) 全量序列化（主流程热路径）
每次选歌/确认（经典 127 步、WC 43 步）都调用：
- `useGameState.js:91-112` `saveState` → `rounds.map(r => r.map(s => s ? slimE(s) : null))` 然后 `JSON.stringify`；
- `useWorldCup.js:250-258` `saveWC` → `serializeWC` 同样全量序列化（含 48 个小组 + 完整 history 的整份 entrant）。

即对**每个槽位都新建一个 slimE 对象**再整体 stringify。在 128 强对局里，每次 pick 序列化 ~255 个含全部字段的对象，纯 JS 主线程同步执行（在 `setTimeout` 回调里，`useGameState.js:234`）。规模越大越重，低端机可能在“胜负动画”间隙感到一顿。

- **方案（强烈建议）**：
  1. **只序列化必要字段**：存档只需 `id/name/pic/picLocal/seedRank` 等展示所需，丢弃 `songPic/albumType/albumDesc/chorus` 等运行时可重建的字段（与 4.3 同理），体积可降数倍；
  2. **只存增量**：经典模式可只存 `rounds` 当前快照（已做）但用更紧凑编码（如 entrant 只存 `id`，从 `singerData.entrants[id]` 还原）；
  3. **节流写盘**：连续快速 pick 时，把 `saveState` 合并到 `requestIdleCallback` / 末次延迟写，避免每步都写；
  4. 存档读取 `loadSaved`（`useGameState.js:114`）一次性 `JSON.parse` + `restoreE`，规模大时也有成本，但属“续玩”一次性，优先级低于写。

### 7.1 P1：资源缓存头与封面失效策略
- 哈希资源（`singer-jay-9bLH6CSF.js` 等）内容寻址，应设 `Cache-Control: public, max-age=31536000, immutable`；
- `covers/album_{mid}.jpg` 同名无哈希（见 3.2），只能短缓存，且更新会脏读。建议内容哈希化或加 `?v=` 版本。

### 7.2 P2：无 Service Worker / 离线能力
当前纯静态 + localStorage，无 SW。作为“可离线游玩”的娱乐应用，这是个体验增强点（可选）。
- **方案**：加一个极简 SW（Workbox 或手写），把 `index.html` + 主 bundle + 已加载歌手 chunk + 已缓存封面缓存为离线可用；注意歌手 chunk 很大，SW 预缓存要克制（只预缓存首屏资源，歌手 chunk 走运行时 cache-first）。

---

## 八、优先级落地清单

| 级别 | 问题 | 位置 | 影响 | 建议 |
|---|---|---|---|---|
| P0 | `onTimeUpdate`→`setCurrentTime` 拖垮整树 4x/秒 | `useAudioPlayer.js:83` / `App.jsx:245` | 试听时全局卡顿 | 进度状态下沉到 PreviewModal / 外部 store |
| P0 | 拖拽 `setDragVisual` 每帧重渲 100+ 卡片 | `RankingScreen.jsx:189` | 排名拖拽卡顿 | ghost 用 ref+rAF 直改 transform，移出列表 state |
| P0/P1 | 歌手 JSON chunk 整库 2–2.6MB 加载 | `useSingerData.js:232` / `singerData/*.json` | 首屏/切歌等待 | 精简字段、两级加载、封面降采样 |
| P1 | `dataCache` 无淘汰 | `useSingerData.js:29` | 内存泄漏 | LRU/上限，轻索引常驻、全量按需 |
| P1 | 音频 URL 无会话内存缓存 | `api.js:89` / `netease.js:109` | 重复请求、回退链放大 | 加内存 Map（QQ/网易云按 songmid） |
| P1 | 存档全量 slimE+stringify | `useGameState.js:91` / `useWorldCup.js:250` | 低端机每步顿挫 | 只存必要字段/增量/节流写盘 |
| P1 | 资源缓存头 & 封面失效 | `vite.config.js` / `covers/*.jpg` | 缓存失效脏读 | 哈希资源 immutable；封面内容哈希/版本 |
| P1 | `assetsInlineLimit:1e8` 隐患 | `vite.config.js:10` | 启用 singlefile 即灾难 | 删/恢复默认 4KB |
| P2 | `MatchCard` 未 memo + 内联回调 | `MatchStage.jsx:35,53` | 重渲染雪崩隐患 | `React.memo` + `useCallback` |
| P2 | 主包含非首屏重模块 | `ChampionShare`/`RankingScreen`/`canvas-confetti` | TTI 偏高 | `React.lazy` + 动态 import |
| P2 | 请求未真正取消 | `api.js:10` / `qqMusic.js:61` | 连点并发 JSONP | 支持 AbortSignal，取消时移除 script |
| P2 | App 渲染期 IIFE/内联 filter | `App.jsx:130,635,676,704,791` | 叠加高频重渲放大 | `useMemo` 包裹 |
| P2 | 多组缓存无上限 | `itunes.js:17,171` / `useCrossSingerSearch.js:22` | 长会话膨胀 | 设上限/定时清理 |
| P3 | 关键 CSS 阻塞 | `index.css` 95KB | 首屏渲染 | preload / 动画拆分 |
| P3 | 无 CDN preconnect | `index.html` | 首图慢 | 加 `preconnect y.gtimg.cn` |
| P3 | 封面 URL 每渲拼接 | `MatchCard.jsx:29-51` | 微小 | `useMemo` 缓存 |

---

## 九、已做得好的地方（保持）

- 歌手数据 **per-singer 代码分割 + 模块级缓存**（`vite.config.js:14` / `useSingerData.js:23,29`），切歌手零重复传输、浏览器可长缓存。
- 图片 `loading="lazy"` + `decoding="async"`（`MatchCard.jsx:137-141` 等）。
- 网络层 `cancelToken` 防竞态（`useAudioPlayer.js:40`）、JSONP script 及时 `removeChild` 清理（`api.js:19`）。
- iTunes `PREVIEW_CACHE`/`ARTIST_CACHE` 记忆化（`itunes.js:17,171`）；网易云 URL localStorage 7 天缓存（`netease.js:13`）。
- 搜索 300ms 防抖 + 结果以 `searchIdRef` 防覆盖（`useDynamicSinger.js:159` / `useCrossSingerSearch.js:54`）。
- 后台渐进式拉取专辑详情（`useDynamicSinger.js:196`），不阻塞首屏。
- 后端代理优先探测 `checkBackend`（`backend.js:7`），自动回退 JSONP/代理。

> 实施顺序建议：**先啃 2 个 P0（音频进度下沉、拖拽 ghost ref 化）→ 再做 2 个 P1 存储/网络（存档精简、音频 URL 内存缓存 + dataCache LRU）→ 最后做资源精简与代码分割**。前两步改动小、收益最高、风险最低。
