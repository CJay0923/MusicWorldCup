-- ============================================================
-- Music World Cup · Cloudflare D1 Schema
-- 应用: npx wrangler d1 execute mwc-db --remote --file=db/schema.sql
-- ============================================================
--
-- 设计原则:
--   1. 只存"预聚合"，不存原始投票流水 —— 写行数砍半，且查询无需扫全表
--   2. 冗余存 title，榜单查询一次搞定，前端无需回查 singerData JSON
--   3. game_session 既是幂等键，又是"最近战报"数据源，1 行承载一整场
--
-- 配额算账 (免费版 10 万写行/天):
--   一场 32 强 = 31 场对决，涉及 32 首歌
--   服务端聚合后 = 32 行 upsert + 1 行 session = 33 写行
--   100,000 / 33 ≈ 每天 3,000 场完整比赛
-- ============================================================

-- ------------------------------------------------------------
-- 核心表: 条目胜负聚合
-- scope = singerId (单歌手) | 'cross:<hash>' (跨歌手) | 'global'
-- item_mid = songmid / albummid / singermid，取决于 item_type
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS song_stat (
  scope      TEXT    NOT NULL,
  item_mid   TEXT    NOT NULL,
  item_type  TEXT    NOT NULL DEFAULT 'song',   -- song | album | singer
  title      TEXT,                              -- 冗余，避免查询后回查
  subtitle   TEXT,                              -- 歌手名/专辑名，跨歌手模式必需
  wins       INTEGER NOT NULL DEFAULT 0,
  losses     INTEGER NOT NULL DEFAULT 0,
  champions  INTEGER NOT NULL DEFAULT 0,        -- 夺冠次数
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope, item_mid)
);

-- 榜单查询走这个索引，避免全表扫描吃掉读行数配额
CREATE INDEX IF NOT EXISTS idx_stat_scope_wins
  ON song_stat(scope, wins DESC);

-- ------------------------------------------------------------
-- 对局记录: 幂等键 + 战报流
-- id 由客户端生成 (crypto.randomUUID)，重复提交直接被 INSERT OR IGNORE 挡掉
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_session (
  id             TEXT    PRIMARY KEY,
  scope          TEXT    NOT NULL,
  mode           TEXT    NOT NULL,              -- classic | worldcup | custom | ranking | cross
  size           INTEGER,                       -- 参赛规模 4/8/.../128
  champion_mid   TEXT,
  champion_title TEXT,
  runner_up_mid  TEXT,
  device_id      TEXT,                          -- 匿名 UUID，用于云端存档/去重
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_scope_time
  ON game_session(scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_device
  ON game_session(device_id, created_at DESC);

-- ------------------------------------------------------------
-- 分享短链 (替代 KV —— KV 每天只有 1000 次写，D1 有 10 万)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS share_link (
  code       TEXT PRIMARY KEY,                  -- 6 位 base62
  session_id TEXT NOT NULL,
  payload    TEXT NOT NULL,                     -- JSON 快照，直接喂给 OG 图渲染
  views      INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
