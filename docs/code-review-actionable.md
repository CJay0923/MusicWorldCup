# 代码层可落地缺陷审查（排除版权合规）

> 范围：仅限代码层面可修复项；版权/法务问题按你的要求暂不处理。
> 依据：已逐行阅读 App.jsx / ChampionScreen / ModeSelector / ErrorBoundary / MiniPlayer / useCrossSingerSearch / useDynamicSinger / filters / useWorldCup.test / index.css / 存档 key 命名。
> 标记：🔴 P0 立即 / 🟠 P1 本季度 / 🟡 P2 下季度 / ⚪ 低优可顺手修。

---

## 🔴 P0-1 冠军页无「返回首页」导航死胡同

**位置**
- `src/App.jsx:927-958`（渲染 `ChampionScreen` 仅传 `onAgain={handleAgain}`，未传 `onReset`）
- `src/components/ChampionScreen.jsx:12`（props 签名只有 `onAgain`，无 `onReset`）
- 顶栏「重新开始」按钮在 `isChampion` 时被隐藏（`App.jsx:763` 条件 `!isChampion && !isRanking`）

**现状**：用户走到冠军页后，界面只有「再战一届」和「查看夺冠之路」，没有回到首页/换歌手/换模式的入口，只能靠浏览器后退。

**根因**：`ChampionScreen` 组件未设计返回首页的回调，App 也未传入。

**修复**
1. `ChampionScreen.jsx` 增加 `onReset` prop，并在按钮区加一个返回按钮：
```jsx
export default function ChampionScreen({ champion, singerName, history, onAgain, onReset }) {
  // ...
  <div className="flex flex-wrap justify-center gap-3">
    {onReset && (
      <button
        className="inline-flex cursor-pointer items-center gap-[7px] rounded-full border border-white/[0.15] bg-white/[0.05] px-4 py-[9px] text-[13px] font-semibold text-white/80 transition-all duration-200 hover:border-white/30 hover:bg-white/[0.1] active:scale-[0.96]"
        onClick={onReset}
        type="button"
      >
        🏠 返回首页
      </button>
    )}
    <button ... onClick={onAgain}>🔄 再战一届</button>
    <button ... onClick={toggleRecap}>{showRecap ? '📋 收起' : '📋 查看夺冠之路'}</button>
  </div>
```
2. `App.jsx:957` 的 `<ChampionScreen ... />` 上补 `onReset={handleReset}`。
   `handleReset`（App.jsx:492）已正确处理：经典模式 `gameState.resetState()`、世界杯 `wcState.resetWC()`，并 `setGameStarted(false)` 回到首页，无需改逻辑。

**影响/工作量**：极小（~10 行），直接消除最高危的导航死胡同。

---

## 🟠 P1-1 ModeSelector 选中态被 Tailwind purge + 缺 warning/info 色 token

**位置**
- `src/components/ModeSelector.jsx:23,32,45`（`border-${themeColor}`、`bg-${themeColor}`、`text-${themeColor}` 动态拼接）
- `src/index.css:4-22`（`@theme` 仅定义 `accent / accent2 / good`，**无 `warning` / `info`**）

**现状**：「多歌手混战」(warning) 与「夯到拉排名」(info) 两个按钮选中时无边框/背景/文字高亮（功能正常，仅视觉缺失）。

**根因（两重）**：
1. 动态拼接类名 `bg-${themeColor}` 在构建期不被 Tailwind v4 静态扫描命中 → 被 purge。
2. `warning` / `info` 这两个 `themeColor` 值**根本没有对应的 `--color-*` token**，即使 safelist 也生成不出颜色。

**修复**
1. `index.css` `@theme` 内补两个 token（颜色按主题自定，建议琥珀/紫）：
```css
  --color-warning: #f59e0b;
  --color-info: #8b5cf6;
```
2. `ModeSelector.jsx` 用**静态类名映射**替代动态拼接（彻底规避 purge）：
```jsx
const THEME = {
  accent:  { border: 'border-accent',  bg: 'bg-accent...', ... }, // 见下
};
```
具体改写：
```jsx
const THEME = {
  accent:  { border: 'border-accent',  bg: 'bg-accent/[0.12]',  text: 'text-accent',  dot: 'bg-accent' },
  good:    { border: 'border-good',    bg: 'bg-good/[0.12]',    text: 'text-good',    dot: 'bg-good' },
  accent2: { border: 'border-accent2', bg: 'bg-accent2/[0.12]', text: 'text-accent2', dot: 'bg-accent2' },
  warning: { border: 'border-warning', bg: 'bg-warning/[0.12]', text: 'text-warning', dot: 'bg-warning' },
  info:    { border: 'border-info',    bg: 'bg-info/[0.12]',    text: 'text-info',    dot: 'bg-info' },
};

// item() 内：
const t = THEME[themeColor] || THEME.accent;
const baseCls = clsx(
  ...modeBtnBase,
  isSelected
    ? clsx(t.border, t.bg, 'shadow-[0_8px_24px_rgba(0,0,0,0.3)]')
    : 'border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06]',
);
// 标题： clsx('font-display text-[15px] font-bold', isSelected ? t.text : 'text-white/9')
// 指示器圆点： clsx('absolute ...', t.dot)
```
注意：`bg-accent/[0.12]` 这类带透明度的字面量现在直接写在源码里，Tailwind v4 会正常生成。

**影响/工作量**：小（~20 行 + 2 行 CSS），修一个可复现的视觉回归。

---

## 🟠 P1-2 ErrorBoundary 一刀切清空全部存档

**位置**
- `src/components/ErrorBoundary.jsx:26-35`（`k.startsWith('song_cup_')` 遍历删除所有匹配 key）
- 存档 key 命名：`useGameState.js:11` → `song_cup_${id}_${bs}`；`useWorldCup.js:28` → `song_cup_${id}_wc`（**同前缀**）

**现状**：任何渲染异常触发 ErrorBoundary 时，会删除**所有歌手、所有模式、所有规模**的 `song_cup_*` 存档并刷新。例如用户 A 的经典进度进行中、用户 B 的世界杯中途报错 → A 的经典进度也被误删。

**根因**：清档逻辑用固定前缀 `'song_cup_'`，未限定到当前对局。

**修复**：ErrorBoundary 接收 `prefixes` prop（数组），默认 `['song_cup_']` 保持兼容；App 按当前模式传入精确前缀。
```jsx
// ErrorBoundary.jsx
handleReset = (prefixes = ['song_cup_']) => {
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      prefixes.some((p) => k.startsWith(p)),
    );
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  window.location.reload();
};
```
```jsx
// App.jsx：渲染 ErrorBoundary 时传入当前对局前缀
const clearPrefixes =
  selectedMode === 'wc'
    ? [`song_cup_${gameSingerId}_wc`]
    : isCustom
      ? [`song_cup_custom_`]
      : [`song_cup_${effectiveSingerId}_`]; // 经典：只清该歌手（含各规模）
```
> 注：`useGameState` 经典 key 含规模后缀，用 `song_cup_${effectiveSingerId}_` 前缀可覆盖该歌手全部规模，符合预期；不会误伤其他歌手。

**影响/工作量**：小（~15 行），消除数据误删风险。

---

## 🟠 P1-3 动态歌手加载失败静默、无重试

**位置**
- `src/hooks/useDynamicSinger.js:301-305`（catch 仅 set 文案「加载失败，请重试」，无重试入口）
- `src/hooks/useCrossSingerSearch.js:145-146`（`catch {}` 纯吞掉，连文案都没有）

**现状**：网络抖动/接口异常时，加载失败被静默处理，用户得不到明确反馈，也无法重试（只能重新搜索/重新点选）。

**修复**
1. `useDynamicSinger.js`：增加 `loadError` 状态并暴露 `retryLoadSinger`：
```jsx
const [loadError, setLoadError] = useState(false);
// catch 内：
} catch {
  if (loadTokenRef.current === myToken) {
    setIsLoadingSinger(false);
    setLoadError(true);
    setLoadingProgress('加载失败，请重试');
  }
}
// 成功路径重置： setLoadError(false)
// 暴露 retryLoadSinger: () => { setLoadError(false); loadDynamicSinger(dynamicSinger); }
```
   并在 `StartScreen` 把「加载失败」文案替换为**错误提示 + 重试按钮**（点击 `retryLoadSinger`）。
2. `useCrossSingerSearch.js`：增加 per-mid 错误态 `loadErrors`（Map），catch 时 `setLoadErrors` 标记该 mid；成功时清除；`addDynamicSinger(singer)` 本身即可作为重试动作，UI 在失败项上显示「重试」调用它。

**影响/工作量**：中（hook ~15 行 + StartScreen UI ~10 行），提升弱网可用性。

---

## 🟠 P1-4 测试：过期断言 + 核心逻辑无覆盖

**位置**
- `src/utils/useWorldCup.test.js:203-206`（`MIN_FAV_WITHOUT_COVER` 常量在代码中不存在）
- `src/utils/filters.js:67`（实际只导出 `MIN_FAV_WITH_COVER = 50000`）
- 缺失：`useGameState` / `useAudioPlayer` / UI 组件均无测试

**现状**：`npm test` 50 项中 1 项失败（引用不存在常量）；经典模式对局状态、音频 5 级降级等核心逻辑无任何回归保护。

**修复**
1. 过期断言改为与代码一致：
```js
it('MIN_FAV_WITH_COVER = 50000', async () => {
  const mod = await import('./filters.js');
  expect(mod.MIN_FAV_WITH_COVER).toBe(50000);
});
```
2. 新增 `src/utils/useGameState.test.js`：覆盖 `pick / undo / resetState / 存档读写`；新增 `useAudioPlayer` 降级顺序的单元桩（至少 happy path + `cancelTokenRef` 作废）。建议优先补 `useGameState`（业务核心，回归风险最高）。

**影响/工作量**：中（修 1 行 + 新增约 60~100 行测试），为后续所有改动立回归护栏。

---

## 🟡 P2-1 大列表无虚拟滚动

**位置**
- `src/components/SongPicker.jsx:161`（歌手全部歌曲一次性渲染）
- `src/components/RankingScreen.jsx`（128 项全量渲染）

**现状**：周杰伦等数百首歌曲/128 项排名全量渲染，低端机滚动掉帧。

**修复（由轻到重）**
- 轻量快速 win：给列表项加 CSS `content-visibility: auto`（几乎零成本，显著减少渲染开销）。
- 彻底方案：引入 `react-window` 对 entrant 列表做 windowing（需加依赖，注意与现有 Tailwind 样式兼容）。

**影响/工作量**：轻量 win 极小；windowing 中（~1 依赖 + 列表组件改造）。

---

## 🟡 P2-2 音频首响慢 / JSONP 全串行

**位置**
- `src/hooks/useAudioPlayer.js`（`openAudition` 5 级顺序降级）
- `src/lib/qqMusic.js:119-133`（`fixedCallbackChain` 强制所有 JSONP 串行）

**现状**：音频最坏等待数十秒；批量抓取受串行链约束，动态歌手初始化偏慢。

**修复方向**
- 并行探测：iTunes 预取 + 运行时搜索可并行发起，先到先播。
- 弱网提示：加载 >1.5s 显示「试听加载中」骨架，避免用户以为卡死。
- JSONP 并发：在 callback 命名空间隔离的前提下放宽串行约束（需小心竞态，建议先在批量 fav 抓取处试点）。
> 属架构级优化，建议单独排期，不在本次顺手修。

---

## 🟡 P2-3 技术债：App.jsx 上帝组件 + 重复转换逻辑

**位置**
- `src/App.jsx`（1055 行，集中全部状态 + 编排 4 个 hook）
- `src/hooks/useDynamicSinger.js:42-120` 与 `src/hooks/useSingerData.js:53-198`（`transformDynamicSingerData` / `transformToSingerData` 高度近似）
- Canvas 分享/导出逻辑在 `ChampionShare.jsx` 与 `RankingScreen.jsx` 各写一套；封面 fallback 在多处复制

**现状**：加新玩法成本高、重复逻辑易漂移、回归面大。

**修复方向（架构级，建议 P2/P3 单独立项）**
- 把 `App.jsx` 的编排拆成按模式的小容器（或在 hooks 内收敛各自状态），降低单文件复杂度。
- 抽一个共享 `transformEntrants(songs, {albumDetails, favMap})` 合并两处转换。
- 抽 `lib/cover.js`（封面 URL 解析）+ `lib/canvasShare.js`（分享图绘制）统一复用。

---

## ⚪ 低优可顺手修

| 位置 | 问题 | 修法 |
|------|------|------|
| `src/components/MiniPlayer.jsx:35` | 无效类名 `rounded-b-lg-[--radius]`（不生效） | 改为 `rounded-b-[var(--radius)]` 或 `rounded-b-lg` |
| `src/App.jsx:763-770` | 「重新开始」在游戏中易误读为「重开同一局」 | 文案改为「↺ 退出并重新开始」或点击前 `confirm` |
| 空状态仅 `RankingScreen` 有 | 其他模式无「无数据」兜底页 | 预取失败时显示提示而非空白 |
| 续玩仅 classic/wc | 自选/跨歌手/排名无续玩 | `StartScreen`「继续」逻辑扩展三模式 |

---

## 审查结论（代码层可落地项总览）

| 优先级 | 项 | 工作量 | 代码风险 |
|--------|----|--------|---------|
| 🔴 P0 | 冠军页返回首页 | 极小 | 无 |
| 🟠 P1 | ModeSelector 选中态(purge+token) | 小 | 无 |
| 🟠 P1 | ErrorBoundary 精确清档 | 小 | 无 |
| 🟠 P1 | 动态加载失败重试 | 中 | 低 |
| 🟠 P1 | 测试：修断言 + 补 useGameState | 中 | 无 |
| 🟡 P2 | 大列表虚拟滚动 | 中 | 低 |
| 🟡 P2 | 音频首响/JSONP并发 | 中-大 | 中 |
| 🟡 P2 | App.jsx 拆分 + 去重 | 大 | 中 |
| ⚪ 低 | MiniPlayer 类名/文案/空状态/续玩 | 极小 | 无 |

**建议执行顺序**：P0 → P1（四项可并行，互不冲突）→ P2 按资源排期。P0/P1 合计改动量小、风险低，可在一个迭代内清完，先把「闭环 + 视觉 + 容错 + 护栏」四件事补齐。
