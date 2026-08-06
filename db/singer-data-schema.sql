-- ============================================================
-- Music World Cup · 歌手数据关系化表结构 (D1)
-- 配合 db/schema.sql (投票/榜单表) 一起执行：
--   npx wrangler d1 execute mwc-db --remote --file=db/schema.sql
--   npx wrangler d1 execute mwc-db --remote --file=db/singer-data-schema.sql
--
-- 设计原则:
--   1. 标量字段 → 列；数组(entrants) → 子表；映射(albumDescs) → 子表
--   2. 歌曲级字段是关系化的真正价值点: 可与 song_stat 按 song_mid JOIN 富化榜单
--   3. 不存整包 JSON: D1 单语句上限 100KB，歌手 payload 可达数百 KB 会超限。
--      改为由关系表在 /api/singer/[mid] 重组为前端所需的 raw 形状（见该 Function）。
--   4. singer_songs.ord 保留原始 entrants 顺序，重组时 ORDER BY 保序，
--      确保对阵树 L/R 分组与历史部署一致。
--   5. 命名: snake_case, 表名单数, 外键 _mid, 时间戳 INTEGER(Unix秒), 布尔用 0/1
-- ============================================================

DROP TABLE IF EXISTS singer_snapshot;
DROP TABLE IF EXISTS singer_album_descriptions;
DROP TABLE IF EXISTS singer_songs;
DROP TABLE IF EXISTS singers;

-- ------------------------------------------------------------
-- 1) singers —— 歌手级标量字段 (原 JSON 顶层标量)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS singers (
  singer_mid        TEXT    PRIMARY KEY,   -- 歌手 key (jay/stefanie...)，即文件名
  name              TEXT    NOT NULL,      -- 原 singerName
  photo             TEXT,                  -- 原 singerPhoto (封面URL)
  bio               TEXT,                  -- 歌手简介（手动导入/管理用，可选）
  source_total_song INTEGER DEFAULT 0,     -- 来源总曲数(仅展示)
  source_album_count INTEGER DEFAULT 0,    -- albumDescs 条数
  entrant_count     INTEGER NOT NULL DEFAULT 0, -- entrants 实际条数(参赛池)
  data_source       TEXT    DEFAULT 'kugou',   -- 数据来源 (kugou/qq/manual/...)
  preprocessed      INTEGER NOT NULL DEFAULT 0, -- 原 preprocessed (布尔 → 0/1)
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

-- ------------------------------------------------------------
-- 2) singer_songs —— entrants 数组 → 子表 (一对多, 核心表)
--    ord 保留原始顺序; song_mid 是跨歌手/投票 JOIN 的钥匙
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS singer_songs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  ord               INTEGER NOT NULL DEFAULT 0,  -- 原始 entrants 下标，重组保序
  singer_mid        TEXT    NOT NULL,
  song_mid          TEXT    NOT NULL,      -- 原 songmid  (JOIN 键!)
  song_id           INTEGER,               -- 原 songid
  name              TEXT    NOT NULL,      -- 原 name
  album_mid         TEXT,                  -- 原 albumMid
  album_name        TEXT,                  -- 原 albumName
  album_date        TEXT,                  -- 原 albumDate (YYYY-MM-DD)
  album_type        TEXT,                  -- 原 albumType
  fav_count         INTEGER DEFAULT 0,     -- 原 favCount (热度, 可排序)
  seed_rank         INTEGER DEFAULT 0,     -- 原 seedRank (抽签种子序)
  itunes_preview_url TEXT,                 -- 原 itunesPreviewUrl
  itunes_track_url  TEXT,                  -- 原 itunesTrackUrl
  itunes_track_id   INTEGER,               -- 原 itunesTrackId
  pic               TEXT,                  -- 原 pic (本地封面路径/URL，UI 的 pic 字段)
  migu_preview_url  TEXT,                  -- 原 miguPreviewUrl (咪咕试听)
  is_representative INTEGER NOT NULL DEFAULT 0, -- 是否代表作品（手动导入标记，0/1）
  created_at        INTEGER NOT NULL,
  FOREIGN KEY (singer_mid) REFERENCES singers(singer_mid) ON DELETE CASCADE,
  UNIQUE (singer_mid, song_mid)
);

-- 索引: 加载某歌手全部歌曲(按序) / 跨歌手按 song_mid 查询 / 按专辑 / 按种子序
CREATE INDEX IF NOT EXISTS idx_song_singer ON singer_songs(singer_mid, ord);
CREATE INDEX IF NOT EXISTS idx_song_mid    ON singer_songs(song_mid);
CREATE INDEX IF NOT EXISTS idx_song_album  ON singer_songs(album_mid);

-- ------------------------------------------------------------
-- 3) singer_album_descriptions —— albumDescs 映射 → 子表
--    原 albumDescs 是 { albumMid: 描述文本 } 的 object
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS singer_album_descriptions (
  singer_mid   TEXT NOT NULL,
  album_mid    TEXT NOT NULL,
  description  TEXT,
  PRIMARY KEY (singer_mid, album_mid),
  FOREIGN KEY (singer_mid) REFERENCES singers(singer_mid) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 4) 视图: 榜单富化 (体现关系化最大优势)
--    song_stat (投票表) 按 item_mid=song_mid JOIN singer_songs
--    → 榜单直接带出 歌名/专辑/歌手, 无需在 stat 冗余 title
-- ------------------------------------------------------------
DROP VIEW IF EXISTS leaderboard_enriched;
CREATE VIEW IF NOT EXISTS leaderboard_enriched AS
SELECT
  s.scope,
  s.item_mid                                   AS song_mid,
  sg.name                                      AS song_name,
  sg.album_name,
  sg.singer_mid,
  si.name                                      AS singer_name,
  s.wins,
  s.losses,
  s.champions
FROM song_stat s
LEFT JOIN singer_songs sg ON s.item_mid = sg.song_mid
LEFT JOIN singers      si ON sg.singer_mid = si.singer_mid;
