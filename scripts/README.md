# 新增歌手操作指南

## 一键添加歌手

使用 `scripts/add_singer.py` 脚本，一条命令完成全部操作。

### 前置准备

获取歌手的 QQ 音乐 `singerMid`：
1. 打开 [QQ 音乐](https://y.qq.com)，搜索目标歌手
2. 进入歌手主页
3. URL 中的 `mid` 参数即为 `singerMid`，例如 `https://y.qq.com/n/ryqq/singer/001BLpXF2DyJe2` → `001BLpXF2DyJe2`

### 命令格式

```bash
python3 scripts/add_singer.py \
  --name "歌手中文名" \
  --mid "QQ音乐singerMid" \
  --key "英文key" \
  --en "英文缩写" \
  --icon "图标emoji" \
  --size 128
```

### 参数说明

| 参数 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `--name` | 是 | 歌手中文名 | `林俊杰` |
| `--mid` | 是 | QQ音乐 singerMid | `001BLpXF2DyJe2` |
| `--key` | 是 | 英文key（变量前缀和SINGERS的key） | `jj` |
| `--en` | 是 | 英文名缩写 | `JJ` |
| `--icon` | 否 | 图标 emoji，默认 `🎤` | `🎶` |
| `--size` | 否 | 对阵规模 64 或 128，默认 `128` | `128` |
| `--skip-fetch` | 否 | 跳过API抓取，使用缓存数据 | - |

### 使用示例

```bash
# 添加林俊杰（128强）
python3 scripts/add_singer.py \
  --name "林俊杰" --mid 001BLpXF2DyJe2 \
  --key jj --en "JJ" --icon '🎶' --size 128

# 添加周杰伦（128强）
python3 scripts/add_singer.py \
  --name "周杰伦" --mid 0025NhlN2yWrP4 \
  --key jay --en "JAY" --icon '🎵' --size 128

# 添加陈奕迅（64强）
python3 scripts/add_singer.py \
  --name "陈奕迅" --mid 003Nz2oI3WoDDj \
  --key eason --en "EASON" --icon '🎤' --size 64
```

---

## 自动执行的 5 个步骤

脚本按顺序自动完成以下操作：

### Step 1: QQ音乐获取歌曲列表
- 调用 QQ音乐 `fcg_v8_singer_track_spg.fcg` 接口
- 按**收藏量降序**获取歌手歌曲
- 自动过滤现场版、伴奏、Remix 等非正式版本
- 自动去重

### Step 2: 网易云匹配 nid
- 对每首歌调用网易云 `/api/search/get` 搜索
- 精确匹配歌名 + 歌手名 → 获取网易云歌曲 ID (`nid`)
- `nid` 用于前端音频播放（网易云试听链接）
- 匹配失败的设为 `null`（该歌无法播放音频，但仍有封面和对阵功能）

### Step 3: QQ音乐获取专辑封面
- 对每首歌调用 QQ音乐 `fcg_play_single_song.fcg` 接口
- 获取歌曲所属专辑的 `albumMid`
- 拼接封面 URL：`https://y.gtimg.cn/music/photo_new/T002R300x300M000{albumMid}.jpg`

### Step 4: 生成 JS 数据并写入 singers.js
- 将歌曲分为 LEFT / RIGHT 两半
- 生成 5 个数组：`{KEY}_LEFT`、`{KEY}_RIGHT`、`{KEY}_NIDS`、`{KEY}_PICS`、`{KEY}_CHORUS`
- 构建 `{KEY}_ENTRANTS` 对象数组
- 自动注册到 `SINGERS` 对象和 `SINGER_ICONS`
- **自动保留已有副歌时间戳**：按歌名映射，即使歌曲顺序变化也不会丢失之前手动标注的 chorus 数据
- **幂等操作**：可安全重复执行，不会产生重复声明或数据丢失

### Step 5: 构建并生成单文件 HTML
- 运行 `npx vite build` 构建生产版本
- 将 CSS 和 JS 内联到单个 HTML 文件
- 输出至 `/workspace/song-worldcup.html`

---

## 手动后续优化

### 补充副歌时间戳 (chorus)

`chorus` 字段标记每首歌副歌开始的时间（秒），用于音频播放时直接跳到高潮部分。

**自动保留机制**：重新运行 `add_singer.py` 时，脚本会自动按歌名提取已有的 chorus 数据并映射到新位置。即使歌曲排名变化导致顺序调整，之前手动标注的副歌时间戳也不会丢失。

```bash
# 方法1: 手动在 singers.js 中填写
# 找到 {KEY}_CHORUS = {} 并添加，如：
const JJ_CHORUS = {0:20.8, 1:69.1, 2:29.7, ...};

# 方法2: 用网易云 API 批量获取（参考 fetch_jj_pics.py 的批量查询模式）
```

> **注意**：chorus 的 key 是数组下标（位置），不是歌名。如果手动修改了歌曲顺序，需要同步调整 chorus 的 key。重新运行脚本时会自动按歌名重新映射，无需手动处理。

### 修复缺失的 nid

```bash
# 查看缺失 nid 的歌曲列表（脚本运行时会自动打印）
# 手动在网易云搜索，找到正确的歌曲 ID 后填入 {KEY}_NIDS 数组
```

### 使用缓存数据重新生成

如果 API 抓取已完成，但需要调整 JS 生成参数（如修改 key、icon），可跳过抓取步骤：

```bash
python3 scripts/add_singer.py \
  --name "林俊杰" --mid 001BLpXF2DyJe2 \
  --key jj --en "JJ" --icon '🎶' --size 128 \
  --skip-fetch
```

缓存文件保存在 `/data/user/work/singer_cache_{key}.json`。

---

## 数据结构说明

`singers.js` 中每个歌手的数据结构：

```javascript
// 数据数组
const {KEY}_LEFT = ["歌名1", "歌名2", ...];    // 前半部分 (size/2 首)
const {KEY}_RIGHT = ["歌名N", ...];             // 后半部分 (size/2 首)
const {KEY}_NIDS = [12345, 67890, null, ...];   // 网易云歌曲ID (null=未匹配)
const {KEY}_PICS = ["https://y.gtimg.cn/...", ...]; // QQ音乐封面URL
const {KEY}_CHORUS = {0: 20.8, 1: 69.1};        // 副歌时间戳 (秒)

// 构建参赛者数组
const {KEY}_ENTRANTS = {KEY}_LEFT.concat({KEY}_RIGHT).map((name, i) => ({
  name, id: i,
  side: i < {KEY}_LEFT.length ? 'L' : 'R',
  seed: i + 1,                              // 种子号 = 排名
  nid: {KEY}_NIDS[i] || null,               // 网易云ID (音频播放)
  pic: {KEY}_PICS[i] || '',                 // 封面URL
  chorus: {KEY}_CHORUS[i] || null,          // 副歌时间戳
  seedRank: i + 1,                          // 种子排名 (按收藏量)
  isSeed: (i + 1) <= 32,                    // 前32名为种子
}));

// 注册到 SINGERS
export const SINGERS = {
  // ...其他歌手
  {key}: {
    name: '歌手名',
    nameEn: 'EN',
    bracketSize: 128,
    entrants: {KEY}_ENTRANTS,
    seeds: {KEY}_ENTRANTS.map((_, i) => i),
    seedRank: Object.fromEntries({KEY}_ENTRANTS.map((e, i) => [i, i + 1])),
  },
};

// 图标
export const SINGER_ICONS = { ..., {key}: '🎤' };
```

## 数据来源

| 数据 | 来源 | 用途 |
|------|------|------|
| 歌曲列表 + 排名 | QQ音乐（按收藏量） | 确定参赛歌曲和种子排名 |
| 歌曲 nid | 网易云音乐 | 音频试听播放 |
| 专辑封面 | QQ音乐 | 对阵卡片展示 |
| 副歌时间戳 | 手动/网易云 | 音频跳转到高潮部分 |

---

## 完整工作流示例

以添加一个新歌手为例，从零到上线的完整流程：

```bash
# 1. 获取 singerMid（在 QQ 音乐歌手页 URL 中找到）

# 2. 一键运行（自动完成 5 步：取歌→匹配nid→取封面→生成JS→构建HTML）
python3 scripts/add_singer.py \
  --name "周杰伦" --mid 0025NhlN2yWrP4 \
  --key jay --en "JAY" --icon '🎵' --size 128

# 3. 检查输出日志中缺失的 nid，手动在网易云搜索补全

# 4. 逐首试听并手动标注副歌时间戳到 {KEY}_CHORUS

# 5. 重新构建（不需要重新抓取数据）
python3 scripts/add_singer.py \
  --name "周杰伦" --mid 0025NhlN2yWrP4 \
  --key jay --en "JAY" --icon '🎵' --size 128 \
  --skip-fetch

# 6. 预览验证
cd /workspace/stefanie-song-worldcup-react && npx vite
```

---

## 幂等性说明

`add_singer.py` 设计为**幂等操作**，可安全重复执行：

- 重新运行时会自动移除旧的数据块和 SINGERS 条目，再插入新的
- 已有的副歌时间戳（chorus）按歌名自动保留，不会丢失
- 已有的 SINGER_ICONS 条目会自动更新
- 缓存文件 `singer_cache_{key}.json` 避免重复 API 调用

适用场景：
- 修改了歌手的 icon 或英文名
- 手动补充了 nid 或 chorus 后需要重新构建
- 歌曲列表有更新需要重新抓取
