# 歌曲世界杯 · 核心玩法机制分析与体验增强方案

> 基于源码实地走查（App.jsx / useGameState.js / useWorldCup.js / MatchStage / MatchCard / RoundOverlay / Confetti / RankingScreen / bracket.js / useKeyboardControls.js）得出的可落地方案。
> 设计原则：**贴合既有 React + 单文件构建 + localStorage 技术栈，不引入新依赖，玩法逻辑连贯，三个新模块均以「观察/包裹现有状态」方式无缝接入。**

---

## 0. 项目类型与现有玩法范围（基线盘点）

**项目类型**：单文件构建（Vite + `vite-plugin-singlefile`）的 React 音乐偏好投票应用。其本质是 **「音乐 GOAT / 对阵淘汰赛」** —— 把歌手的歌曲（或专辑、歌手本身）放进签表，由玩家两两比较、投票晋级，直至产生冠军。核心是「主观偏好 × 结构化赛制」。

**现有玩法范围（5 大模式）**：

| 模式 | 核心机制 | 关键代码 |
|---|---|---|
| 经典模式 | 单败淘汰 4→128 强，1v1 投票选胜者，按 `seedRank` 蛇形种子位 | `useGameState.js` |
| 世界杯模式 | 48 首抽签分 12 组 → 四选二（每组选 2）→ 外卡复活（12 个第三名选 8）→ 32 强 KO | `useWorldCup.js` |
| 自选模式 | 从歌手曲库自选 N 首打迷你签表 | `buildCustomSingerData` |
| 跨歌手混战 | 多歌手歌曲/专辑/歌手对决 | `buildCrossSingerData` 系列 |
| 夯到拉排名 | 拖拽式 Tier List（夯/顶级/人上人/NPC/拉完了），可导出图片 | `RankingScreen.jsx` |

**核心交互**：点击卡片 / `← →` / `A L` 选边；`1-4` 四选二切换；试听（iTunes 30s → QQ 音乐降级）；回退上一场（`undo`）；localStorage 存档续玩；750ms 胜负过渡动画 + 轮次浮层 + 纸屑庆祝。

---

## 1. 现状诊断（可优化的环节）

### 1.1 节奏 —— 长局疲劳、前期无差异、WC 小组重复
- 经典 128 强 = **127 场**，前期（128→64→32）低 stakes 却占 7 成场次，易疲惫；每场固定 `PICK_DELAY=750ms`（`useGameState.js:10`、`useWorldCup.js:27`），无加速感。
- 轮次浮层（`RoundOverlay`）只在「轮次结束」出现，缺少 **25%/50%/75% 里程检查点**，长局无「歇口气」的节奏呼吸。
- WC 小组赛 **12 次重复同一套四选二**，无微变化，机械感强。

### 1.2 难度曲线 —— 偏好投票无「显式难度」
- 赛制本身已通过种子位天然形成「前期弱强分明、后期势均力敌」的曲线，但**完全不可见**——玩家感知不到「这场很难」。
- 没有「爆冷 / 共识」这类可被量化的张力维度，决策缺乏情绪峰值。

### 1.3 互动性 —— 缺张力、缺社交、缺情绪峰值
- `VS` 徽章（`MatchStage.jsx:44`）有呼吸动画，但每场都一样，没有「势均力敌的紧张感」反馈。
- 试听沉浸尚可，但投票瞬间缺乏「你刚刚干了一件大胆的事」的惊喜反馈。
- 无好友/社区对比，分享仅限冠军图（`ChampionShare`），缺少「比一比」的社交钩子。

### 1.4 奖励机制 —— 仅冠军庆祝，无进程化
- 唯一奖励是 `Confetti` + `ChampionScreen` + 分享图。无跨会话统计、无称号、无徽章、无连胜/无回退等过程奖励。
- 重玩动力仅靠「再战一届」，缺乏目标驱动（achievement / daily）。

### 1.5 留存 —— 无每日/连胜/目标驱动
- 没有「每日挑战」「连续登录」「里程碑」这类轻量留存机制。

---

## 2. 优化方案（四大维度）

### 2.1 玩法节奏调整
1. **早期轮次「极速模式」**：128 强前期（≥ 16 强前）提供「快进」开关——将 `PICK_DELAY` 由 750ms 降到 350ms，并隐藏轮次浮层（仅保留决赛前一次）。可在 `useGameState`/`useWorldCup` 内加 `turbo` 参数控制延迟。
2. **自适应加速**：随轮次推进自然收紧延迟（750 → 决赛 450ms），营造「越接近冠军越快」的紧张加速感。
3. **里程碑检查点**：在 `doneCnt / progTotal` 达到 25/50/75% 时触发轻量 `RoundOverlay` 变体（文案如「已完成一半！喝口水继续～」），给长局节奏呼吸。
4. **WC 小组微变化**：给 12 个小组按 `seedRank` 分布标注风味标签（如「死亡之组」「新锐组」「同专辑组」），并在小组卡上展示，消除机械重复感。

### 2.2 难度曲线优化
1. **难度可视化**：用双方 `seedRank` 差计算「紧张度」——差越小越紧张。在 `MatchCard` 顶部加一个细的「对决张力条」（如 `|seedA - seedB|` 映射成 0–100%）。
2. **显式双轴评分**：定义「共识分」= 所选方是否更高 `seedRank`（更大众）；「大胆分」= 是否爆冷（低 seedRank 胜高 seedRank）。这两个维度在冠军页汇成一句**打法称号**（见 2.4）。
3. **自适应规模 & 新手默认小场**：首次玩家默认 16 强；完成场次越多，解锁更大签表作为「进阶」。

### 2.3 互动性提升
1. **张力/动量反馈**：当张力条高时，`VS` 徽章加强脉冲、卡片边框微颤（纯 CSS），让「难选」被看见。
2. **爆冷彩蛋动效（Whimsy 注入）**：检测到爆冷 pick（低 seed 胜高 seed）时，播放一次性「💥 爆冷！」粒子 + 卡片抖动 + 俏皮文案（如「评委席沸腾了」）。复用 `launchConfetti` 思路，新增轻量 `launchPop`。
3. **试听沉浸**：试听中卡片封面随播放态轻微律动（已 hover 放大，加 `playing` 态脉冲即可）。
4. **社区对比钩子**：冠军分享图增加「你的打法标签」，并生成可复制的「挑战链接」（基于歌手+规模+日期种子），朋友打开即同签表可比。

### 2.4 奖励机制改进
1. **进程化统计（跨会话）**：localStorage 存 `song_cup_stats`：累计投票场数、最常玩歌手、最快夺冠、最少回退夺冠等。首页展示「你的战绩」。
2. **冠军称号系统（基于打法）**：根据统计生成称号——`共识之王`（高共识）、`冷门猎手`（多爆冷）、`闪电裁决`（快）、`完美通关`（零回退）、`全满贯`（完成 128 强）。显示在 `ChampionScreen` 与分享图。
3. **过程奖励**：零回退夺冠 → 特殊纸屑配色；连续爆冷 N 次 → 即时 Toast。
4. **纸屑强度分级**：按签表规模/决赛张力放大 `launchConfetti` 粒子数与时长。

---

## 3. 三个可无缝接入的新玩法模块

> 三个模块均**不修改核心状态机逻辑**，而是以「观察现有状态」或「包裹现有 pick 流」方式接入，做到玩法逻辑连贯、风险可控。

### 模块 A：成就系统（Achievement System）— 持久化徽章 ⭐ 推荐 P0
**接入方式（零侵入）**：新增 `src/hooks/useAchievements.js`，在 `App.jsx` 中调用，仅 **观察** `gameState` / `wcState` 的返回字段（`champion`、`history` 长度、`undo` 是否用过、爆冷次数、耗时），检测解锁条件，写入 `localStorage('song_cup_achievements')`。无需改动 `useGameState`/`useWorldCup`。

**数据模型**：
```js
// 成就定义（whimsical 风格）
const ACHIEVEMENTS = {
  first_champ:  { icon:'🏆', title:'初登王座', desc:'赢得你的第一个冠军' },
  no_undo:      { icon:'🛡️', title:'铁血裁判', desc:'全程未回退完成一届' },
  upset_master: { icon:'🔥', title:'冷门猎手', desc:'单届制造 5 次爆冷' },
  speed_demon:  { icon:'⚡', title:'闪电裁决', desc:'3 分钟内夺冠' },
  full_128:     { icon:'💯', title:'全满贯', desc:'完成 128 强马拉松' },
  cross_king:   { icon:'🌐', title:'群雄割据', desc:'跨歌手混战夺冠' },
  tier_done:    { icon:'📊', title:'秩序守护', desc:'完成一次夯到拉排名' },
};
```

**解锁检测（伪代码）**：
```js
function useAchievements(mode, gameState, wcState) {
  const [unlocked, setUnlocked] = useState(loadAch());
  useEffect(() => {
    const champ = mode==='wc' ? wcState.champion : gameState.champion;
    if (!champ) return;
    const history = mode==='wc' ? wcState.wc?.history : gameState.history;
    const upserts = countUpsets(history);          // 低 seed 胜高 seed 的次数
    const noUndo = !usedUndoRef.current;           // App 记录是否调用过 undo
    const newOnes = [];
    if (!unlocked.first_champ) newOnes.push('first_champ');
    if (noUndo) newOnes.push('no_undo');
    if (upserts >= 5) newOnes.push('upset_master');
    if (elapsed < 180) newOnes.push('speed_demon');
    if (size===128) newOnes.push('full_128');
    // 写入 + 触发 Toast
    if (newOnes.length) { saveAch(unlocked, newOnes); toast(newOnes); }
  }, [champ]);
  return unlocked;
}
```
**呈现**：解锁瞬间用现有 `RoundOverlay` 风格的轻量 `Toast`；首页增设「奖杯墙」展示已得/未得徽章（未得置灰+暗示条件）。

---

### 模块 B：限时挑战（Timed Challenge）— 高分竞速 ⭐ 推荐 P1
**接入方式（包裹 pick 流）**：新增模式 `'timed'`，**复用 `useGameState`** 生成签表与 `pick`，仅在 `App.jsx` 加一个倒计时环：计时归零时若本场未投，则自动调用 `gameState.pick(higherSeedSlot)`（或更刺激：随机），并累加「已完成场数」得分。不改变 `pick` 内部逻辑。

**UI/交互**：
- `MatchStage` 上方加环形倒计时（SVG `stroke-dashoffset` 动画）。
- 连击数（连续在剩余 >50% 时投出）= 加分倍率。
- 结束页显示得分、最多连击、爆冷数，可分享。

**伪代码（App.jsx 片段）**：
```js
const [timedLeft, setTimedLeft] = useState(60);
useEffect(() => {
  if (mode!=='timed' || isChampion) return;
  const t = setInterval(() => setTimedLeft(s=>{
    if (s<=1) { autoPickBySeed(); return 60; }   // 超时自动判，进入下一题
    return s-1;
  }), 1000);
  return () => clearInterval(t);
}, [mode, curMatch]);

function autoPickBySeed() {
  const [a,b] = getCurrentMatchPair();
  const slot = (a.seedRank <= b.seedRank) ? 0 : 1;  // 默认选更大众的一方
  handlePick(slot);
}
```
**计分**：`score = 完成场数*10 + 连击奖励 + 爆冷*15`，存 `song_cup_stats.bestTimed`。

---

### 模块 C：随机事件（Random Events）— 彩蛋回合 ⭐ 推荐 P1
**接入方式（确定性 RNG + 前置 Banner）**：基于 `singerId + 日期 + 签表规模` 做**确定性种子 RNG**（`mulberry32`），在每场 1v1 前算出本场是否触发事件、触发哪类，结果用 `matchId`（轮次+序号）做 key 缓存，保证**存档续玩一致、可复现**。仅在 `MatchStage` 上方加 `<EventBanner>`，不改动 `pick` 逻辑。

**事件类型（whimsical + 张力）**：
- 🎲 **爆冷赌局**：投票前押注「本场会爆冷吗？」猜中 +额外称号分；纯表演，不影响晋级。
- 📊 **观众投票**：展示「社区倾向 %」（由双方 `seedRank` 归一化推导），制造「你敢逆主流吗」的张力。
- 💞 **双选温情局**：提示「这首和那首都出自同一专辑」的趣味知识卡。
- 🕰️ **怀旧局**：标注「这首歌发行于 200X 年」，触发回忆杀文案。

**伪代码（确定性事件）**：
```js
function seededRand(seedStr){ let h=2166136261; for(const c of seedStr) h=(h^c)*(16777619); return ()=>{ h^=h>>>15; h=Math.imul(h,2246822507); return ((h>>>0)/4294967296); }; }

function getMatchEvent(singerId, round, match, dateKey){
  const rnd = seededRand(`${singerId}-${dateKey}-${round}-${match}`);
  const roll = rnd();
  if (roll < 0.12) return { type:'gamble', text:'🎲 赌一把：本场会爆冷吗？' };
  if (roll < 0.24) return { type:'audience', text:'📊 社区更看好这一侧' };
  if (roll < 0.32) return { type:'nostalgia', text:'🕰️ 怀旧局' };
  return null;
}
```
**呈现**：`EventBanner` 用现有 `bg2`/圆角风格，2 秒轻提示或常驻小标；`audience` 事件在两侧卡显示倾向百分比条。

---

## 4. 落地路线与优先级

| 优先级 | 项 | 工作量 | 风险 | 说明 |
|---|---|---|---|---|
| P0 | 成就系统（A） | 低 | 低 | 纯观察+localStorage，不参与核心逻辑，最稳 |
| P0 | 难度可视化/张力条 | 低 | 低 | 仅 `MatchCard` 展示层 + `seedRank` 计算 |
| P1 | 限时挑战（B） | 中 | 中 | 复用 `pick`，需新增计时与结束页 |
| P1 | 随机事件（C） | 中 | 低 | 确定性 RNG + Banner，不改 pick |
| P1 | 冠军称号 + 战绩统计 | 中 | 低 | 基于已有 `history` 统计 |
| P2 | 早期极速/自适应延迟 | 低 | 中 | 需动 `PICK_DELAY`，注意存档兼容 |
| P2 | 每日挑战（彩蛋） | 中 | 低 | 日期种子固定签表，天然社交钩子（B/C 之上延伸） |

**注意点**：
- 所有新增 localStorage key 加前缀并 `try/catch`（与现有 `saveState` 一致），避免隐私模式报错中断。
- 确定性 RNG 必须绑定 `dateKey`，保证「同日期同签表」可对比，且续玩时事件稳定。
- 可访问性：动画遵循 `prefers-reduced-motion`；键盘操作（`useKeyboardControls`）需同步支持新模块的快捷键。
- 性能：纸屑/粒子复用现有 `utils/confetti.js` 的 `requestAnimationFrame` 方案，控制粒子数。

---

## 5. 一句话总结

现有赛制底子扎实（种子位、存档、多模式、试听），短板在**长局节奏、难度可见性、奖励与留存**；以「成就系统 + 限时挑战 + 随机事件」三个零侵入模块补上进度感、张力与重玩钩子，并用张力条/爆冷彩蛋把原本隐形的难度曲线变成可感知的乐趣——全部贴合单文件 React 技术栈，改动集中在展示层与新增独立 hook，核心状态机保持不变。
