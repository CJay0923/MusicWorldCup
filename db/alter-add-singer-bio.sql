-- ============================================================
-- Music World Cup · 给现有 D1 库补列（已建库但有旧 schema 时执行）
-- 用法:
--   npx wrangler d1 execute mwc-db --remote --file=db/alter-add-singer-bio.sql
--
-- 注意: SQLite 不支持 `ADD COLUMN IF NOT EXISTS`，若列已存在会报
-- "duplicate column name"，属预期，可忽略。
-- 全新库请用 db/singer-data-schema.sql（已含这两列）。
-- ============================================================

ALTER TABLE singers ADD COLUMN bio TEXT;
ALTER TABLE singer_songs ADD COLUMN is_representative INTEGER NOT NULL DEFAULT 0;
