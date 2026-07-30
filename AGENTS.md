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
├── download-singer-data.js # 预取歌手数据到 JSON
├── fetch-itunes-previews.js # 预取 iTunes 试听 URL
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
- 新增歌手数据通过 `scripts/download-singer-data.js` 预取到 `src/data/singerData/{id}.json`
- 状态逻辑按功能拆分到对应 hook 中
- 共享的过滤/归一化逻辑放在 `utils/filters.js` / `utils/text.js`

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
- 支持歌曲试听（iTunes 30s 预览优先，QQ 音乐流媒体降级，搜索页兜底）
- 键盘操作（Esc 关闭播放器，Enter 处理浮层，A/L 也可选择）
- 存档/续玩（localStorage 持久化，按歌手ID + 模式隔离）
- 动态歌手搜索（运行时 QQ Music JSONP 搜索任意歌手并加载歌曲）
