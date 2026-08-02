# 歌曲世界杯 · 视觉设计优化建议（审计 + 落地方案）

> 基于真实代码审计：`src/index.css`、`StartScreen.jsx`、`MatchCard.jsx`、`ModeSelector.jsx`、`PillButton.jsx`、`SingerSelector.jsx`，含暗黑 / 新粗野亮色双主题。
> 所有问题均标注文件位置，方案给出可直接套用的代码。严重度：P0=影响可用性/明显 bug，P1=明显美观/对比度问题，P2=打磨项。

---

## 设计原则（本次补充约束 · 最高优先级）

> 视觉风格追求**独特、克制、贴合项目调性**：优先实色、留白、清晰排版与有目的的装饰元素；**禁止**千篇一律的渐变背景、怪异/不自然的光效、彩色外发光、呼吸光斑、无限脉冲动画。

1. **实色优先**：背景、卡片、按钮一律纯色或低透明度叠加，不用渐变模拟质感。
2. **光效克制**：不用彩色外发光（colored box-shadow glow）、呼吸光斑、辉光动画；阴影只用中性色、低模糊的平实投影，且仅在需要分层时使用。
3. **层级靠排版**：视觉层级由字号 / 字重 / 间距 / 留白建立，不靠发光堆砌。
4. **装饰须有目的**：纹理、遮罩只有在承担功能（如保证图上文字可读）时才保留。
5. **验收标准**：把全部渐变与发光移除后，页面层级依然成立——否则就是装饰在替排版打工。

---

## 〇、当前主要问题速览

| # | 问题 | 位置 | 严重度 | 影响 |
|---|------|------|--------|------|
| 1 | 模式选中态颜色不生效（动态类名未生成） | `ModeSelector.jsx:23/32/45` | **P0** | "多歌手混战""夯到拉排名"选中后无高亮，用户不知道选了哪个 |
| 2 | 未选中模式标题 `text-white/9`（≈9% 白） | `ModeSelector.jsx:32` | **P0** | 4 个未选中模式标题近乎不可见，对比度 ~1.3:1 |
| 3 | 大量次要文字 `white/35~45` 低于 WCAG AA | 全局（hint、meta、描述） | **P0** | 小字说明/提示文字看不清，对比度 2.6–3.3:1（需 ≥4.5:1） |
| 4 | 三处永续动画互相抢视线 | `StartScreen` 英雄光晕 + 奖杯 float + CTA pulse | P1 | 页面"很吵"，显廉价，降低主行动聚焦 |
| 5 | 无统一字号阶梯 / 间距标尺 | 全局散用 9–52px 与 `mb-[30px]` | P1 | 层级不清晰，节奏不一致 |
| 6 | H1 渐变里硬编码 `#FFB627` 绕过令牌 | `StartScreen.jsx:187` | P2 | 违背设计系统，主题切换时不可控 |
| 7 | 按钮语言不统一（胶囊 / 卡片 / .wc-btn / 内联） | 多组件 | P1 | 交互预期不一致 |
| 8 | 亮色主题全黄底 + 全元素硬阴影过重 | `index.css:59-93,110-133` | P1 | 长文阅读疲劳，硬阴影糊成一片 |
| 9 | emoji 当图标（模式/标签/试听） | 全局 | P2 | 缩放发虚、描边不一致，显"模板感" |
| 10 | 首页为超长单栏，赛制说明默认全展开 | `StartScreen.jsx:218-431` | P1 | 首屏信息过载，需大幅下滑才能到"开始" |
| 11 | 渐变与彩色光效泛滥（渐变标题/渐变按钮/发光边框/呼吸光斑） | 全局多处 | P1 | 模板套路、显廉价，违背本次补充约束（详见第十节清单） |

---

## 一、整体布局结构

**问题**
- 首页 `StartScreen` 是"英雄区 → 5 段赛制说明（默认全部展开）→ 歌手选择 → 模式选择 → 规模/歌曲选择 → CTA"的超长单栏，首屏被说明文字占满，"开始"按钮需要滚动才能稳定看到。
- 5 套赛制说明用 5 个独立 `div` 分别 `display:none/block` 切换，结构重复、体积大，且默认展开加重首屏负担。
- 模式相关配置（规模、专辑、前 N）散落在不同 `flex` 区块，缺乏"分组容器"语义。

**方案**
1. **赛制说明默认折叠**，展开项仅展示当前所选模式；并改用 `details/summary` 或受控折叠，减少首屏高度 ~40%。
2. **把"模式专属配置"收进与 ModeSelector 并列的分组卡片**，给每个区块一个左侧色条 + 小标题，强化"现在在配置哪一步"的认知。
3. **首屏焦点收敛**：英雄区 + 模式选择 + 主 CTA 在首屏可见；歌手/规模等次级配置在其下，用 `max-w-[720px]` 居中容器统一宽度。
4. 比赛舞台（`MatchCard` 双栏）已是合理结构，保持不变。

> 落地：把 `StartScreen` 中赛制说明的 `rulesCollapsed` 默认值改为 `true`；首屏只渲染"英雄 + ModeSelector + CTA"，其余区块用分组容器包起来并加 `scroll-mt` 锚点。

---

## 二、色彩搭配与对比度

**问题（最严重的一组）**
- 暗色主题下 `--muted: #8b8f9a` 本身合格（≈5.9:1），但大量地方直接写 `text-white/35`、`/40`、`/45`、`/60` 代替 muted：
  - `StartScreen` 底部提示 `text-white/35`（12px）→ 对比度 ~2.6:1 ❌
  - `MatchCard` "点击选择晋级" `text-white/40`（12.5px）→ ~2.9:1 ❌
  - `ModeSelector` 描述 `text-white/45`（11.5px）→ ~3.3:1 ❌
  - 未选中模式标题 `text-white/9` → ~1.3:1 ❌❌
- 强调红 `#e63946` 作小字时有 4.8:1，刚好过线但无余量；亮色主题珊瑚红 `#FF6B6B` 在黄底上作文字对比度不足。
- 强调色使用分散：red(左/经典)、amber(右/世界杯)、green(晋级)、blue(自选) 四色并发，缺乏"主色唯一"的克制。

**方案**
1. **统一次要文字令牌**：所有次要/说明文字改用 `--muted` 或固定 `text-white/65~70`（≥4.5:1）；三级文字最低 `white/55`。建立断言语：
   - 主文 `text-ink`（#e8eaed）
   - 次文 `text-muted`（#8b8f9a，≥4.5:1）
   - 弱文 `white/55`（仅用于非关键角标）
2. **修掉 `text-white/9`**：未选中模式标题改为 `text-white/55`，选中态再用强调色。
3. **强调色收敛为"一主一辅"**：保持 red 为主行动色（CTA、左半区），amber 为世界杯辅助色；green 仅用于"晋级/成功"，blue 仅用于"自选/信息"。避免四色同时大面积出现。
4. 亮色主题：把 `--muted` 调深到 `#3a3a3a`，珊瑚红文字改为用更深描边 + 白底胶囊，保证 ≥4.5:1。

> 落地示例（替换散用低透明度）：
> ```jsx
> // 之前
> <div className="text-[12.5px] font-semibold tracking-wide text-white/40">点击选择晋级</div>
> // 之后
> <div className="text-[12.5px] font-semibold tracking-wide text-muted">点击选择晋级</div>
> ```

---

## 三、字体排版与层级

**问题**
- 字号散乱、无模块化阶梯：出现 `clamp(30,6vw,52)`、`24`、`20`、`15`、`13.5`、`12.5`、`11`、`9`、`10` 等多种，缺乏"哪级对应什么角色"的规则。
- `font-display`（DIN/Bebas 等拉丁窄体）用在含中文的标题上，中文会回退到 PingFang/雅黑，导致"周杰伦歌曲世界杯"是"拉丁窄体数字 + 中文黑体"混排，字重/字宽不一致。
- H1 是 `bg-clip-text` 渐变文字且硬编码 `via-[#FFB627]`：属模板套路、渲染易发虚，且绕过令牌体系——按本次约束应整体改实色（见第十节 #2）。
- `tracking-tight` 直接用在中文大标题上会显得拥挤。

**方案**
1. **建立字号阶梯（写在 `:root` 或 Tailwind 主题）**：
   ```
   display 52 / h1 34 / h2 24 / h3 18 / body 15 / small 13 / micro 11
   ```
   全站只从这 7 级取，不再出现 12.5、13.5、20 等游离值。
2. **中文标题不用 `font-display`**：`font-display` 仅用于数字/英文（如比分、种子号、轮次名）；中文标题用专门的中文字体栈（如 `'PingFang SC','Microsoft YaHei',sans-serif` 加 `font-black`），并对中文用 `tracking-normal`/`tracking-wide` 而非 `tracking-tight`。
3. **H1 改实色排版（见第十节 #2）**：删除 `bg-clip-text` 渐变，标题用 `text-ink`，关键词可用 `text-accent` 点缀——既规避发虚，也去掉"渐变标题"套路。
4. 统一行高：正文 `leading-relaxed`（1.6 已有），大标题 `leading-[1.1]`。

---

## 四、间距与留白

**问题**
- 有 `--radius` 令牌，但**没有间距标尺**；组件混用 Tailwind 默认步（`gap-2/3/4`、`mb-4/5`）和任意值（`mb-[30px]`、`px-2.5`、`gap-[9px]`），垂直节奏不统一。
- 英雄区 `pt-14`、各区块 `mb-[30px]`、`mb-5`、`mb-4`、`mb-3`、`mb-2` 交替，缺乏"区块间距 > 组内间距"的清晰层级。

**方案**
1. **定义 8px 基准间距标尺**并全程使用：`2/4/8/12/16/24/32/48/64`（对应 Tailwind 的 0.5/1/2/3/4/6/8/12/16）。删掉 `mb-[30px]` 这类任意值，统一为 `mb-8`（32px）。
2. **区块间距统一**：相邻大区块用 `space-y-8` 或固定 `gap-8`；区块内部元素用 `gap-3/4`。让"组间 > 组内"一眼可辨。
3. 英雄区下方留白加大（`pb-10`），让标题与说明自然呼吸。

---

## 五、组件视觉样式（按钮 / 卡片 / 表单）

### 5.1 按钮一致性（P1）
**问题**：存在四套按钮语言——`PillButton`（圆角胶囊，用于切换）、`ModeSelector` 卡片（圆角方块）、`.wc-btn`（独立 CSS，仅配 `--primary`）、`StartScreen` 内联大 CTA。语义不统一，用户对不同"可点"元素的预期混乱。

**方案**：收敛为三种语义按钮，全站复用：
- **Primary**：填充强调色 + 圆角 `lg`，仅用于"开始/下一步"主行动（用 `StartScreen` 现有 CTA 风格）。
- **Ghost/Secondary**：透明底 + 细边，用于"继续上次"等次级。
- **Chip/Pill**：圆角胶囊，仅用于多选切换（`PillButton` 已是对的，保留）。
- `ModeSelector` 的模式卡**不是按钮，是单选卡**——保持方块卡片样式，但与 Chip 视觉拉开（卡片有图标+标题+描述，Chip 只有文字），不要混用。

### 5.2 选中态颜色不生效（P0，最关键 bug）
**问题**：`ModeSelector` 用模板字符串拼类名 `border-${themeColor}`、`bg-${themeColor}/[0.12]`、`text-${themeColor}`。Tailwind JIT **无法从动态插值生成工具类**，且 `@theme` 里**根本没有定义 `warning` / `info` 这两个色令牌**（只有 accent/good/accent2/side-left/side-right）。结果：选中"多歌手混战""夯到拉排名"时，边框/底色/标题色全部不生成，选中态与未选中几乎无差别。

**方案 A（最小修复——补令牌）**：在 `@theme` 与 `[data-theme="light"]` 中补 `warning`/`info`，并映射到现有调色板（不引入新色，避免违规紫）：
```css
/* index.css @theme 内追加 */
--color-warning: var(--side-right); /* 琥珀，呼应右半区/世界杯 */
--color-info:    var(--accent2);     /* 蓝，呼应自选/信息 */

/* 同时给 :root 与 [data-theme=light] 补对应变量（light 里 warning/info 也要有值） */
```
> 注意：`[data-theme="light"]` 里也要定义 `--color-warning` / `--color-info`，否则亮色下同样失效。

**方案 B（更稳——不依赖动态类名）**：把 `ModeSelector` 的 `themeColor` 改成查表对象，类名写全字面量（Tailwind 才能识别），例如：
```jsx
const COLOR = {
  classic: { sel: 'border-accent bg-accent/[0.12] text-accent', dot: 'bg-accent' },
  wc:      { sel: 'border-good bg-good/[0.12] text-good',       dot: 'bg-good' },
  custom:  { sel: 'border-accent2 bg-accent2/[0.12] text-accent2', dot: 'bg-accent2' },
  'cross-battle': { sel: 'border-side-right bg-side-right/[0.12] text-side-right', dot: 'bg-side-right' },
  ranking: { sel: 'border-accent2 bg-accent2/[0.12] text-accent2', dot: 'bg-accent2' },
};
```
并修复未选中标题：`text-white/9` → `text-white/55`。**推荐 A+B 一起做**，A 保证令牌体系完整，B 从源头消除"动态类名不生成"的隐患。

### 5.3 卡片（MatchCard）
**问题**：整体较好（全幅封面 + 底渐变 + 半区标签）。但失败态 `opacity-40 grayscale` 仍占满 380px 高，晋级后对手卡一片灰，略压抑；试听/听原曲两个胶囊在窄封面下可能换行拥挤。

**方案**：失败卡高度可略缩（`scale-[0.97]` 已有，可加 `opacity-50`）；操作按钮行在 <380px 宽度时允许换行（`flex-wrap`）并减小内边距；胜出遮罩的 ✓ 勾选用更克制的描边圆，避免红底大圆"糊脸"。

### 5.4 表单（搜索 / 输入）
**问题**：`SingerSelector` 搜索框 `placeholder:text-white/25` 占位符过淡（~1.8:1）；搜索结果下拉是裸网格，无容器边框区分；聚焦环 `focus:shadow-[0_0_0_3px_rgba(230,57,70,0.15)]` 只有外发光无实边，键盘焦点不够明确。

**方案**：占位符提到 `placeholder:text-white/40`；搜索结果加 `rounded-xl border border-white/10 bg-bg2` 容器；聚焦态改为 `focus:border-accent focus:ring-2 focus:ring-accent/40`，与全局 `:focus-visible` 轮廓一致。

---

## 六、响应式适配

**问题**
- `StartScreen` 主 CTA `px-12 py-4 text-lg` 在 360px 窄屏下若文案较长（"开始 128 强"）可能贴边；模式卡固定 `w-[180px]`，窄屏两列后间距吃紧。
- `MatchCard` `min-h-[380px]` 在手机上两卡上下堆叠，单卡占半屏多，滑动成本高；歌名 `clamp(28px,5.5vw,44px)` 在手机上 28px 偏稳但长歌名会折 3 行。
- WC 小组网格 `repeat(4,1fr)` 仅在 ≤720px 降为 2 列，平板（721–1024）仍是 4 列小卡，封面 78px 尚可但文字拥挤。

**方案**
1. CTA 改 `px-8 sm:px-12`，并 `w-full max-w-[320px] sm:w-auto` 让窄屏整行、宽屏自适应。
2. 模式卡 `w-[150px] sm:w-[170px]`，`gap-3 sm:gap-4`，保证 2 列在 360px 不溢出。
3. `MatchCard` 在 `<640px` 时 `min-h-[300px]`、封面占比提高、歌名降到 `clamp(22px,7vw,32px)`，减少折行。
4. WC 小组网格断点加 `md`（≤1024 先降 3 列，≤720 再降 2 列）。

---

## 七、视觉重点引导（Focal Guidance）

**问题**
- 三个永续动画同屏竞争：英雄背景 `heroGlow 6s infinite` + 奖杯 `float 4s infinite` + CTA `ctaPulse 3s infinite`。眼睛不知道看哪，且不停地动显廉价。
- H1 渐变 + 英雄光晕 + 奖杯发光，顶部"光污染"过重，反而弱化了本应最突出的 CTA。
- CTA 的 `ctaPulse` 无限脉冲是典型 SaaS 模板套路，降低高级感。

**方案**
1. **只保留一个永续微动**：奖杯 `float`（缓慢、幅度小）保留；**直接删除英雄区光斑 div**，`heroGlow` keyframes 一并移除，背景改纯色 `var(--bg)`——光晕属非自然光效，按本次约束清掉。
2. **CTA 去掉无限 pulse 与全部彩色光晕**：静态实色底（`bg-accent`），悬停仅做轻微位移 + 中性平实阴影（`hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)]`），禁止彩色外发光。
3. **建立焦点层级**：①主 CTA（唯一填充红，最大）②当前模式卡（强调色边框）③次级操作（幽灵按钮）。其余一律降噪（去发光、降透明度）。
4. 选中态用"色边 + 微底色 + 底部指示点"三层表达（已有雏形），保持即可。

---

## 八、优先级行动清单

**P0（先修，影响可用/明显 bug）**
1. `ModeSelector` 补 `warning`/`info` 令牌（或改查表字面量），修复"多歌手混战/夯到拉排名"选中态。
2. 未选中模式标题 `text-white/9` → `text-white/55`。
3. 全局 `white/35~45` 次要文字统一提升到 `--muted` 或 `white/65+`，过 WCAG AA。

**P1（明显美观/体验）**
4. 三处永续动画收敛为 1 处（奖杯 float），CTA 去无限 pulse；并按第十节「渐变与光效清理清单」全局去渐变、去光效。
5. 建立 7 级字号阶梯 + 8px 间距标尺，替换散用值。
6. 首页赛制说明默认折叠，首屏聚焦"英雄+模式+CTA"。
7. 统一按钮三语义（Primary/Ghost/Chip），模式卡与 Chip 视觉拉开。
8. 亮色主题降噪：黄底限用于强调区，硬阴影只留给主按钮。

**P2（打磨）**
9. H1 渐变文字改实色排版（见第十节 #2）。
10. emoji 图标逐步替换为内联 SVG（模式/标签/试听），保留 emoji 仅作品牌语气点缀。
11. 搜索框占位符、结果容器、聚焦环细化。

---

## 九、可立即落地的关键补丁（代码片段）

**补丁 1 — 修复模式选中色（index.css `@theme` 内追加）**
```css
--color-warning: var(--side-right);
--color-info:    var(--accent2);
```
并在 `[data-theme="light"]` 内追加对应 `--color-warning` / `--color-info`（值取亮色侧 `var(--side-right)` / `var(--accent2)`）。
同时建议把 `ModeSelector` 的 `themeColor` 改为上面"方案 B"的查表字面量，从源头消除动态类名风险。

**补丁 2 — 修复未选中标题对比度（ModeSelector.jsx:32）**
```jsx
// 之前
isSelected ? `text-${themeColor}` : 'text-white/9',
// 之后
isSelected ? `text-${themeColor}` : 'text-white/55',
```

**补丁 3 — CTA 去渐变底 + 去无限脉冲 + 去光晕（StartScreen.jsx:746-747）**
```jsx
// 实色底 + 无彩色光晕 + 无动画；悬停只做位移与中性平实阴影
className="... rounded-2xl border-2 border-accent bg-accent px-12 py-4 font-display text-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)] active:translate-y-0.5 ..."
```

**补丁 4 — H1 渐变文字改实色（StartScreen.jsx:187-194）**
```jsx
// 删除 bg-gradient-to-r ... bg-clip-text text-transparent
// 改：主色 text-ink，关键词可点缀 text-accent
<h1 className="mx-0 mb-1.5 mt-[18px] font-display text-[clamp(30px,6vw,52px)] font-black leading-[1.15] tracking-tight text-ink text-balance">
```

---

## 十、渐变与光效清理清单（本次约束落地）

> 原则：实色优先；阴影只用中性色低模糊平实投影；彩色外发光、呼吸光斑、渐变模拟一律移除。以下按文件逐一列出当前写法与替换方式。

### 全局（src/index.css）

| 位置 | 当前 | 替换 |
|------|------|------|
| L176-186 `body::before` | 三组径向渐变光斑 + 线性渐变背景 | 实色 `background: var(--bg)`（纯色，无渐变无光斑） |
| L136-142 亮色 `body::before` | 同上变体 | 实色 `#FFE66D` |
| L207-210 `heroGlow` | 呼吸光斑动画 keyframes | 删除（连同 `StartScreen.jsx:185` 的引用 div） |
| L227-230 `ctaPulse` | 无限脉冲 keyframes | 删除（连同 CTA 上的引用） |
| L217-225 `trophy-svg` | `drop-shadow(0 4px 20px rgba(255,210,74,0.3))` 金辉 | 去 drop-shadow，保留 `float` 微动 |
| L646-649 `.wc-group-stage` | `0 12px 36px rgba(0,0,0,0.4)` | `0 4px 16px rgba(0,0,0,0.25)` 平实 |
| L655-659 `.wc-card:hover` | 金色发光边框 `rgba(255,210,74,0.45)` + 发光阴影 | 实色边框 `1px solid var(--border-color)` + 平实阴影 |
| L661-665 `.wc-card--selected` | 绿色 `0 0 0 1px` 光晕 + 发光阴影 | 实色 `2px solid var(--good)` + 浅绿底色 |
| L690-695 `.wc-phase-tab--active` | `linear-gradient(135deg, var(--accent), #ffb13d)` | 实色 `background: var(--accent)` |
| L735-743 `.wc-btn--primary` | 渐变底 + 彩色光晕 | 实色 `var(--accent)`，无光晕 |
| L703 `.wc-overlay` | `backdrop-blur(10px)` 玻璃感 | 降为 6px 或改纯色遮罩（材料效果，按需） |

### 组件（src/components）

| 位置 | 当前 | 替换 |
|------|------|------|
| `StartScreen.jsx:185` | heroGlow 径向光斑 div | 整块删除 |
| `StartScreen.jsx:187-188` | H1 `bg-clip-text` 渐变文字 | 实色 `text-ink`，关键词 `text-accent`（补丁 4） |
| `StartScreen.jsx:221+` 规则面板 | `0_8px_24px rgba(0,0,0,0.4)` + blur | 平实阴影，去 blur |
| `StartScreen.jsx:747` CTA | 渐变底 + `0_0_30px` 光晕 + ctaPulse | 实色 `bg-accent` + 中性平实阴影（补丁 3） |
| `MatchCard.jsx:91-104` | hover / win 彩色发光边框与阴影 | 实色边框 + 平实阴影；win 态用深色描边 |
| `MatchCard.jsx:114` 底部渐变遮罩 | 功能性遮罩（保证图片上文字可读） | **保留**——属于"有目的"装饰 |
| `PillButton.jsx:26+` | active `shadow-[0_4px_16px_var(--color-accent)/20]` | 去掉彩色阴影 |
| `SingerSelector.jsx:94` | 选中卡 `rgba(230,57,70,0.15)` 光晕 | 平实阴影或去阴影 |
| `SingerSelector.jsx:142` | focus 外发光 `rgba(230,57,70,0.15)` | `focus:border-accent focus:ring-2 focus:ring-accent/40` 实色环 |

### 保留项（有目的的装饰，符合约束）

- 噪点纹理 `body::after`（L189-198）：极淡（0.03）材质纹理，非渐变非光效，可保留或降至 0.02。
- `MatchCard` 底部渐变遮罩：功能必要性（图上文字可读），保留。
- 亮色主题硬阴影（Neo-Brutalism `4px 4px 0 #1a1a1a`）：实色平投影，符合"实色、克制"精神，保留。

### 验收标准

- 移除全部渐变与发光后，页面层级依然清晰（由字号 / 字重 / 间距 / 留白承担层级）。
- 全站截图无"彩色光晕像素"；阴影均为中性色低模糊。

---

> 下一步建议：若认可，我把 **P0 三件套（补丁 1–3）+ 第十节「渐变与光效清理清单」 + 字号/间距标尺** 一并落到 `src/index.css` 与对应组件，并出一个修正后的首页对照原型供你审阅。
