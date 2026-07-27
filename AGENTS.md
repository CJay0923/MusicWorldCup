# AGENTS.md - Music World Cup

## 项目简介

歌曲世界杯 (Music World Cup) — 歌手代表作淘汰赛投票应用，支持经典模式和世界杯模式。

## 技术栈

- **框架**: React 18.3 (JSX，无 TypeScript)
- **构建**: Vite 6
- **状态管理**: React hooks (useState, useCallback, useRef, useEffect)
- **样式**: 纯 CSS
- **数据持久化**: localStorage
- **音频**: HTML5 Audio + 第三方 API

## 项目结构

```
src/
├── App.jsx                  # 主应用组件
├── main.jsx                 # 入口
├── index.css                # 全局样式
├── components/
│   ├── AudioPlayer.jsx      # 底部音频播放器
│   ├── ChampionScreen.jsx   # 冠军展示页
│   ├── Confetti.jsx         # 纸屑动画
│   ├── MatchCard.jsx        # 歌曲对决卡片
│   ├── MatchStage.jsx       # 比赛舞台
│   ├── ModeSelector.jsx     # 模式选择
│   ├── ProgressBar.jsx      # 顶部进度条
│   ├── RoundOverlay.jsx     # 轮次过渡弹窗
│   ├── SingerSelector.jsx   # 歌手选择
│   ├── StartScreen.jsx      # 首页
│   ├── TrophySvg.jsx        # 奖杯 SVG
│   └── wc/                  # 世界杯模式专用组件
│       ├── DrawScreen.jsx
│       ├── GroupPickStage.jsx   # 四选二小组赛舞台
│       ├── GroupResultScreen.jsx
│       ├── KOBracket.jsx
│       ├── WCPhaseBar.jsx
│       └── WildcardScreen.jsx
├── data/
│   └── singers.js           # 歌手数据（歌曲列表、封面、种子排名、高潮时间点）
├── hooks/
│   ├── useAudioPlayer.js    # 音频播放逻辑
│   ├── useGameState.js      # 经典模式状态管理
│   └── useWorldCup.js       # 世界杯模式状态管理
└── utils/
    ├── bracket.js           # 对阵生成、洗牌
    ├── confetti.js          # 纸屑动画逻辑
    └── format.js            # 数据序列化/反序列化
```

## 常用命令

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器（支持局域网访问）
npm run build        # 生产构建
npm run preview      # 预览构建产物
```

## 开发规范

- 组件使用 `.jsx` 后缀，hooks 使用 `.js` 后缀
- 无 TypeScript，纯 JavaScript + JSX
- 不使用外部 UI 库，所有组件手写
- 样式写在 `src/index.css` 中
- 新增歌手数据在 `src/data/singers.js` 中添加
- 状态逻辑按功能拆分到对应 hook 中

## 功能说明

### 两种游戏模式
- **经典模式**: 标准单败淘汰赛 (128/64 强 → 冠军)
- **世界杯模式**: 小组赛 → 外卡复活 → 淘汰赛

### 核心功能
- 世界杯小组赛采用「四选二」：每组 4 首直接选 2 首晋级（键盘 1/2/3/4 切换、Enter 确认）
- 淘汰赛阶段为二选一对投票决定晋级（← 选左，→ 选右）
- 支持歌曲试听（高潮片段自动播放）
- 键盘操作（Esc 关闭播放器，Enter 处理浮层/确认）
- 存档/续玩（localStorage 持久化）
