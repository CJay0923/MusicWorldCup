# AGENTS.md - Music World Cup

## 项目简介

歌曲世界杯 (Music World Cup) — 歌手代表作淘汰赛投票应用，支持经典模式和世界杯模式。

## 技术栈

- **框架**: React 18.3 (JSX，无 TypeScript)
- **构建**: Vite 6 (单文件构建 `vite-plugin-singlefile`)
- **状态管理**: React hooks (useState, useCallback, useRef, useEffect)
- **样式**: 纯 CSS（单文件 `src/index.css`）
- **数据持久化**: localStorage
- **音频**: HTML5 Audio + iTunes Search API / QQ 音乐 JSONP
- **测试**: Vitest

## 项目结构

```
src/
├── App.jsx                  # 主应用组件（编排层）
├── main.jsx                 # 入口（包裹 ErrorBoundary）
├── index.css                # 全局样式（单文件）
├── components/
│   ├── ErrorBoundary.jsx    # 全局错误边界
│   ├── ChampionScreen.jsx   # 冠军展示页
│   ├── ChampionShare.jsx    # 冠军晋级之路分享图（Canvas 绘制）
│   ├── Confetti.jsx         # 纸屑动画
│   ├── CrossSingerSelector.jsx  # 跨歌手混战歌手选择器
│   ├── LoadingOverlay.jsx   # 加载遮罩
│   ├── LyricsView.jsx       # 歌词视图
│   ├── MatchCard.jsx        # 歌曲对决卡片（支持歌曲/专辑/歌手三种类型）
│   ├── MatchStage.jsx       # 比赛舞台
│   ├── MiniPlayer.jsx       # 迷你播放器
│   ├── ModeSelector.jsx     # 模式选择
│   ├── PreviewModal.jsx     # 试听弹窗
│   ├── ProgressBar.jsx      # 顶部进度条
│   ├── RankingScreen.jsx    # 夯到拉排名模式
│   ├── RoundOverlay.jsx     # 轮次过渡弹窗
│   ├── SingerSelector.jsx   # 歌手选择
│   ├── SongPicker.jsx       # 自选模式歌曲选择器
│   ├── StartScreen.jsx      # 首页（含歌手搜索、模式选择、自选）
│   ├── TrophySvg.jsx        # 奖杯 SVG
│   └── wc/                  # 世界杯模式专用组件
│       ├── DrawScreen.jsx       # 抽签结果
│       ├── GroupPickStage.jsx   # 四选二小组赛舞台
│       ├── GroupResultScreen.jsx # 小组结果
│       ├── KOBracket.jsx        # 淘汰赛签表
│       ├── WCPhaseBar.jsx       # 阶段栏
│       └── WildcardScreen.jsx   # 外卡复活
├── data/
│   ├── singers.js           # 歌手元数据 + 常量 + 跨歌手/自选/排名构建函数
│   ├── singerRegistry.js    # 歌手注册表（singermid、photo 等）
│   └── singerData/          # 预取 JSON 歌曲数据（懒加载）
├── hooks/
│   ├── useAudioPlayer.js    # 音频播放逻辑（iTunes → QQ 音乐多级降级）
│   ├── useCrossSingerSearch.js # 跨歌手动态搜索与加载
│   ├── useDynamicSinger.js  # 动态歌手搜索与加载（运行时 QQ 音乐）
│   ├── useGameState.js      # 经典模式状态管理
│   ├── useKeyboardControls.js # 键盘事件管理
│   ├── useMultiSingerData.js   # 多歌手并行加载
│   ├── useSingerData.js     # 歌手数据懒加载 hook（带模块级缓存）
│   └── useWorldCup.js       # 世界杯模式状态管理
├── lib/
│   ├── api.js               # 前端 API 客户端（QQ 音乐 JSONP 直连）
│   └── qqMusic.js           # QQ Music JSONP + CORS 代理双策略
└── utils/
    ├── bracket.js           # 对阵生成、洗牌、蛇形种子位
    ├── bracket.test.js      # bracket 单元测试
    ├── useWorldCup.test.js  # WC 常量/序列化/过滤单元测试
    ├── confetti.js          # 纸屑动画逻辑
    ├── filters.js           # 共享 Live/伴奏过滤逻辑
    ├── format.js            # 数据序列化/反序列化（slimE/restoreE）
    ├── itunes.js            # iTunes Search API 工具（运行时回退）
    ├── lyrics.js            # 歌词解析
    ├── nidMatcher.js        # 网易云 nid 匹配
    └── text.js              # 歌曲名归一化、去重 key
scripts/
├── add_singer.py           # 新增歌手标准化流水线
├── add-album-track.js      # 回填专辑曲序 albumTrack 并重排
├── download-singer-data.js # 预取歌手数据到 JSON（QQ 管线）
├── download-kugou-singer-data.js # 预取歌手数据到 JSON（酷狗管线，当前数据源，主用）
├── fetch-itunes-previews.js # 预取 iTunes 试听 URL（输出到 src/data/singerData，支持 CLI 传 id 增量跑）
├── fetch-migu-previews.js   # 预取咪咕整曲 URL（回填 miguPreviewUrl，仅处理 iTunes 未覆盖歌曲）
├── fetch-kugou-heat.js     # 回填酷狗真实热度（kugouOwnerCount/kugouHeatLevel）
└── README.md
```

## 常用命令

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器（支持局域网访问）
npm run build        # 生产构建
npm run preview      # 预览构建产物
npm test             # 运行单元测试
npm run lint         # ESLint 检查
```

## 开发规范

- 组件使用 `.jsx` 后缀，hooks 使用 `.js` 后缀
- 无 TypeScript，纯 JavaScript + JSX
- 不使用外部 UI 库，所有组件手写
- 样式写在 `src/index.css` 中
- 新增歌手数据通过 `scripts/download-kugou-singer-data.js` 预取到 `src/data/singerData/{id}.json`（酷狗数据源，主用；`scripts/download-singer-data.js` 为 QQ 旧管线备用）
- 状态逻辑按功能拆分到对应 hook 中
- 共享的过滤/归一化逻辑放在 `utils/filters.js` / `utils/text.js`

### 数据字段与热度

- `src/data/singerData/{id}.json` 的 `entrants` 数组**已按热度预排序**（运行时不再排序）
- 当前数据源为**酷狗**（`scripts/download-kugou-singer-data.js`），排序即酷狗 `singer/song?sorttype=0` 热度序（晴天第一），字段：
  - `songmid` = 酷狗 hash（32 位十六进制），`songid` = 酷狗 audio_id
  - `albumMid` = 酷狗 album_id（数字），`albumName`/`albumDate`/`pic`（本地封面路径）
  - `picKugou`：酷狗封面 CDN 直链（`union_cover` 的 `{size}` 已替换为 400），下载到 `public/covers/album_{album_id}.jpg`
  - `kugouOwnerCount` / `kugouHeatLevel`：由 `scripts/fetch-kugou-heat.js` 回填（`singer/song` 接口**无**此字段，需 song_search_v2）
  - `favCount`：酷狗数据中为 0（排序不依赖它，酷狗列表已带热度序）
  - `albumType`：空字符串（酷狗无此字段）；`albumTrack`：null（酷狗无专辑内曲序字段）
  - `nid`：null
- **酷狗过滤规则**（download-kugou-singer-data.js）：
  - `is_original=1` 保底原唱（缺失时不拦截）；`trans_param.is_original` 是 UGC 污染关键信号
  - `album_id` 非 0 且 `album_name` 非空（剔除单曲/无归属混入）
  - `UGC_ALBUM` 正则（歌单/精选/合集/榜单/风云榜/100首/镇站之宝/晚会/春晚/总决赛/好声音/也许该懂事了等）剔除 UGC 合辑专辑
  - `UGC_NAME` 正则（3D环绕/Demo/饭制/剪辑/片段/钢琴版/四手联弹/组曲等）剔除再创作版本
  - `JUNK_TRACK` 加 DJ版/慢摇/嗨曲/音乐频道等（剔除 DJ 混音、电视节目现场版）
  - Live/现场/伴奏/串烧正则 + baseKey 去重
  - is_original 语义复杂（1/2/4/10 可为正式版，5/6/9 多为现场/影视版），仅对 5/6/9 且非 Live 歌名拦截，正式专辑歌不受影响
  - 多歌手合唱（如珊瑚海/千里之外/屋顶）是合法歌，保留；他人主唱误挂（如周民航、周杰伦 - 爱情不是毒药）靠 UGC 专辑名拦截
- **专辑信息补全**（download-kugou-singer-data.js 内建）：
  - `album/song?albumid=` 列表顺序即专辑曲序（trans_param.sort）→ 回填 `albumTrack`
  - `album/info?albumid=` 的 `intro` → 回填 `albumDescs`；`publishtime` → 回填更准的 `albumDate`
  - 20 位歌手 4118 首歌 100% 有曲序，1030 张专辑有简介
  - `albumType` 酷狗无此概念（空字符串）；前端 `singers.js` 在 albumType 为空时靠专辑名正则 + 歌曲数门槛判断个人专辑
- 网易云 nid 覆盖率低（~2%，web 搜索被翻唱淹没），`fetchNeteaseNid` 的 fallback `songs[0]?.id` 会错挂，勿依赖
- `itunesPreviewUrl` / `itunesTrackUrl` / `itunesTrackId`：由 `scripts/fetch-itunes-previews.js` 预取回填（输出到 `src/data/singerData/{id}.json`，支持 CLI 传歌手 id 增量跑），覆盖约 79%（3267/4118，2026-08 酷狗数据源 + cn/tw/us/hk 四商店跑）；热门主打全命中；粤语/台语歌多覆盖低（eason 52%、sandy 65%、leehom 70%、mayday 72%）
- `miguPreviewUrl`：由 `scripts/fetch-migu-previews.js` 预取回填（`migu-api-enhanced` 搜索 + `getUrlH5V24(contentId,'LQ')`），处理**全部歌曲**（跳过已有 miguPreviewUrl），命中 2776/3648（76.1%，2026-08 全量跑）；源为咪咕免费 CDN `freetyst.nf.migu.cn` 整曲 MP3，取 base 路径（去掉 `Tim/Key/msisdn` 等签名参数）后稳定可长期播放、无需登录/VIP、国内可达；全量后 Migu 整曲覆盖 **3246/4118 (78.8%)**；iTunes 未覆盖 + Migu 未命中共 381 首（多为合集/Live/OST/纯音乐）
- 试听降级链（useAudioPlayer）：**预取 Migu 整曲（优先，可整曲试听+自动定位高潮）→ 预取 iTunes 30s 预览 → 运行时 iTunes 搜索 → 网易云 → QQ 流媒体 → 搜索页**；无 chorus 数据时对 >35s 的歌自动 seek 到 40% 位置（副歌通常在 35%-45%）；iTunes+Migu 双预取总覆盖 **90.7%**（3737/4118）
- **新增播放源字段必须同步到数据流**：`transformToSingerData`（useSingerData.js 快速/慢速两路径）、`buildCustomSingerData`（singers.js 自选模式）、`slimE/restoreE`（format.js 存档续玩）都要带上新字段，否则运行时 entrant 缺字段、试听仍走 30s 预览
- iTunes 匹配归一要点（fetch-itunes-previews.js 内建）：歌名统一 `baseKey(t2s(normalizeVariants()))`，含 opencc 简繁转换盲区修复（甚麼→什么、麼/幺→么、後→后、化粧→化妆）与同音异体词表（印地安→印第安等）；拉歌覆盖 **cn+tw+us+hk** 四商店（HK 含大量粤语歌，对 eason/sandy 提升明显），`seenId` 去重
- 酷狗数据源探测结论：`mobilecdn.kugou.com/api/v3/singer/song?singerid=` 可拿全量列表（含 album/hash/封面，自带 `sorttype` 热度序），但**无 OwnerCount**；`song_search_v2` 有 OwnerCount 但按歌手搜不全量。酷狗 `pay_type=3` VIP 歌播放流为空，**不能作播放源**，播放统一走 iTunes 试听
- 旧 QQ 数据备份：`C:\Users\Cjay\AppData\Local\Temp\opencode\singerData-qq-full-backup\`（含 iTunes 字段，回滚备用）
- `public/covers/` 现有 2661 张酷狗封面 + 20 张歌手头像

## 功能说明

### 游戏模式
- **经典模式**: 标准单败淘汰赛 (4~128 强 → 冠军)，支持自选规模
- **世界杯模式**: 小组赛（四选二）→ 外卡复活 → 32 强淘汰赛
- **自选模式**: 从歌手全部歌曲中自选 N 首进行淘汰赛
- **跨歌手混战**: 多位歌手的歌曲/专辑/歌手本身进行对决
- **夯到拉排名**: 分层排名模式（歌曲/专辑/歌手，支持单歌手或多歌手）

### 核心功能
- 世界杯小组赛采用「四选二」：每组 4 首直接选 2 首晋级（键盘 1/2/3/4 切换）
- 淘汰赛阶段为二选一对投票决定晋级（← 选左，→ 选右）
- 支持歌曲试听（iTunes 30s 预览优先，预取缺失时运行时 iTunes 搜索，网易云/QQ 流媒体仅作次要回退）
- 键盘操作（Esc 关闭播放器，Enter 处理浮层，A/L 也可选择）
- 存档/续玩（localStorage 持久化，按歌手ID + 模式隔离）
- 动态歌手搜索（运行时 QQ Music JSONP 搜索任意歌手并加载歌曲）
