# 歌曲世界杯 · 前端 UI 优化执行提示词

> 复制以下内容整体粘贴给编码 agent 即可执行。

---

你是前端工程师，请对「歌曲世界杯（Music World Cup）」React 项目（位于当前工作区）实施 UI 优化。

## 项目背景
- 歌手代表作淘汰赛投票应用，支持经典 / 世界杯 / 自选 / 跨歌手混战 / 夯到拉排名等模式。
- 技术栈：React 18 + Vite 6 + Tailwind CSS v4（`src/index.css` 用 `@import 'tailwindcss'` + `@theme` 设计令牌）+ 单文件 `src/index.css` 手写类。
- 视觉风格：暗黑 GOAT 主题，配色语义为红 `--color-accent`、蓝 `--color-accent2`、琥珀（右阵营）`--color-right`、红（左阵营）`--color-left`。

## 目标
在不破坏现有玩法与视觉风格的前提下，修复设计系统冲突、提升可访问性、复用组件、补齐响应式、优化图片性能。

## 硬性约束（必须遵守）
- 不引入新依赖（除非为修 bug 所必需，并先说明原因）。
- 改动后 `npm run lint`、`npm run build`、`npm test` 必须全部通过。
- 保持现有暗黑 GOAT 视觉风格与红/蓝/琥珀三色阵营语义。
- 不删除仍在使用的功能；删除前必须全局确认无引用。

---

## 任务清单（按优先级执行）

### 【P0-1】修复设计令牌命名冲突（根因级 bug）
**根因**：`src/index.css` 的 `@theme` 中定义了 `--color-left` 与 `--color-right`，Tailwind v4 会据此生成 `text-left` / `text-right` / `bg-right` 等**颜色工具类**，与 Tailwind 自带的同名 `text-align` / `background-position` 工具类冲突，导致对齐与配色被静默覆盖、`MatchCard.jsx` 中左右阵营配色可能失效。

**操作**：
1. 将令牌改名为 `--color-side-left` / `--color-side-right`（保留 `--color-accent`、`--color-accent2` 不变）。
2. 全局搜索 `text-right`、`bg-right`、`border-right`（作为颜色使用时），替换为 `text-side-right` / `bg-side-right` / `border-side-right`；保留真正的对齐类 `text-left` / `text-right`（文本对齐）**不要误改**。
3. 重点核对 `src/components/MatchCard.jsx` 与 `src/App.jsx` 中左右阵营悬停/选中配色仍正确。

### 【P0-2】对决卡片语义化与键盘可达
**根因**：`src/components/MatchCard.jsx` 整卡用 `<div onClick={onPick}>` 承载「选晋级」主操作，不是可聚焦元素，Tab/读屏无法到达。

**操作**：
1. 给卡片根节点加 `role="button"`、`tabIndex={0}`、`aria-label`（含歌曲/专辑/歌手名）。
2. 加 `onKeyDown`：监听 Enter / Space 触发 `onPick`，并用 `e.preventDefault()` 阻止 Space 滚动页面。
3. **不要**把根节点改成原生 `<button>`——卡片内已有嵌套的 `<button>`（试听 / 听原曲），button 套 button 是非法 HTML。保持 `div + role`。
4. 为聚焦态补一个 `focus-visible` 发光样式（复用 `:root` 的 `--accent`）。

### 【P1-1】统一可选按钮 / 分段控件
**现状**：`src/index.css` 中 `.size-btn`、`.cross-battle-tab`、`.ranking-tab`、`.bracket-size-btn` 四套手写类，加上 `src/App.jsx` 顶栏内联按钮，重复实现「可选按钮」模式。

**操作**：
1. 抽出一个共享组件（如 `src/components/ui/PillButton.jsx` 或 `SegmentedControl.jsx`），用已有令牌实现 默认 / 悬浮 / 选中 / 禁用 态。
2. 先替换 4 处手写类与顶栏内联按钮，确认视觉一致后再删除旧 CSS 类。

### 【P1-2】处理 MiniPlayer 死代码
**根因**：`src/components/MiniPlayer.jsx` 已实现（含播放/暂停、进度拖拽、高潮标记）但 `src/App.jsx` 未引用（实际走 `PreviewModal`）。

**操作**：全局确认确无引用后，二选一——（A）删除该文件及未用 import；或（B）将其接入 `MatchCard` 作为卡内迷你播放条复用。**不要留半吊子状态。**

### 【P1-3】响应式补测与修正
**重点页面**（参考 `MatchStage.jsx` 已有的 `grid-cols-[1fr_auto_1fr] max-md:grid-cols-1` 写法）：
- `src/components/wc/KOBracket.jsx`
- `src/components/wc/DrawScreen.jsx`
- `src/components/wc/WildcardScreen.jsx`
- `src/components/ChampionShare.jsx`
- `src/components/RankingScreen.jsx`

**操作**：在 375px / 768px / 1280px 三档宽度自查是否存在横向溢出、错位、文字截断；按需补充 `max-sm:` / `max-md:` 断点。`MatchStage` 本身已处理，重点查上述其余页面。

### 【P2-1】图片性能与 CLS
**位置**：`src/components/MatchCard.jsx` 内封面图与歌手头像两处 `<img>`。

**操作**：
1. 增加 `decoding="async"`。
2. 补 `width` / `height`，或在 CSS 用 `aspect-ratio` 固定容器比，消除图片加载时的布局抖动（CLS）。
3. 可选：加 `srcset` 做 Retina 适配。
4. 修复 `border-3`（非 Tailwind 标准宽度类，当前不生效）改为 `border-[3px]` 或在 `@theme` 定义。

### 【P2-2】可访问性细节
1. `src/index.css` 新增 `@media (prefers-reduced-motion: reduce)`，对 `heroGlow` / `float` / `ctaPulse` / `pulse` 等无限动画及 hover 位移做降级（`animation: none`）。
2. 修正 `MatchCard.jsx` 中歌曲（非专辑/歌手）分支的 `alt` 文本——当前写死为「专辑封面」，应改为「歌曲封面」。

---

## 验证标准
1. `npm run lint` 无错；`npm run build` 成功；`npm test` 通过。
2. 手动核对：
   - 首页各模式「可选按钮」选中态视觉一致；
   - 1v1 卡片可用 Tab 聚焦、回车/空格选择；
   - 移动端 375px 走完整世界杯流程无横向滚动；
   - 系统开启「减少动态效果」后动画停止；
   - 红/蓝/琥珀三色阵营配色在令牌改名后仍正确。
3. 完成后用中文简述改动点与遗留风险。
