/**
 * POST /api/vote/batch
 * 赛后一次性提交整场结果。绝不逐票上报 —— 那会瞬间打爆 10 万写行/天的配额。
 *
 * Body:
 * {
 *   sessionId: "uuid",              // 客户端 crypto.randomUUID()，幂等键
 *   scope:     "003fA5G40AelRt",    // singerId | cross:xxx
 *   mode:      "classic",
 *   size:      32,
 *   deviceId:  "uuid",              // 可选，匿名标识
 *   champion:  { mid, title },
 *   runnerUp:  { mid },             // 可选
 *   matches:   [{ winner: {mid,title,subtitle,type}, loser: {...} }]
 * }
 */

const MAX_MATCHES = 300;
// D1 硬限制: 单条查询最多 100 个绑定参数。每行 9 个 → 分片 10 行/条最安全。
const CHUNK = 10;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/**
 * 只接受来自本站的提交，挡掉最低级的脚本刷量。
 * sendBeacon 在部分浏览器下不带 Origin，故回退到 Referer。
 */
function originAllowed(request, env) {
  const src = request.headers.get('Origin') || request.headers.get('Referer');
  if (!src) return false;
  try {
    const url = new URL(src);
    if (env.ALLOWED_ORIGIN) return url.origin === env.ALLOWED_ORIGIN;
    const host = url.hostname;
    return (
      host.endsWith('.pages.dev') ||
      host.endsWith('.workers.dev') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

function bump(agg, item, w, l) {
  if (!item || typeof item.mid !== 'string' || !item.mid) return;
  const mid = item.mid.slice(0, 64);
  let row = agg.get(mid);
  if (!row) {
    row = {
      mid,
      type: typeof item.type === 'string' ? item.type.slice(0, 16) : 'song',
      title: typeof item.title === 'string' ? item.title.slice(0, 200) : null,
      subtitle: typeof item.subtitle === 'string' ? item.subtitle.slice(0, 200) : null,
      wins: 0,
      losses: 0,
      champions: 0,
    };
    agg.set(mid, row);
  }
  row.wins += w;
  row.losses += l;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'db_unbound' }, 503);
  if (!originAllowed(request, env)) return json({ error: 'forbidden' }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const { sessionId, scope, mode, size, deviceId, champion, runnerUp, matches } = body || {};

  if (typeof sessionId !== 'string' || sessionId.length < 8 || sessionId.length > 64)
    return json({ error: 'bad_session_id' }, 400);
  if (typeof scope !== 'string' || !scope || scope.length > 128)
    return json({ error: 'bad_scope' }, 400);
  if (!Array.isArray(matches) || matches.length === 0 || matches.length > MAX_MATCHES)
    return json({ error: 'bad_matches' }, 400);

  const now = Date.now();

  // ---- 步骤 1: 抢占 sessionId。已存在 = 重复提交，直接返回，绝不重复计数 ----
  let inserted;
  try {
    inserted = await env.DB.prepare(
      `INSERT OR IGNORE INTO game_session
         (id, scope, mode, size, champion_mid, champion_title, runner_up_mid, device_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        sessionId,
        scope,
        typeof mode === 'string' ? mode.slice(0, 32) : 'classic',
        Number.isInteger(size) ? size : null,
        champion?.mid ?? null,
        champion?.title ?? null,
        runnerUp?.mid ?? null,
        typeof deviceId === 'string' ? deviceId.slice(0, 64) : null,
        now
      )
      .run();
  } catch (err) {
    return json({ error: 'db_error', detail: String(err).slice(0, 200) }, 500);
  }

  if (inserted.meta?.changes === 0) {
    return json({ ok: true, duplicated: true });
  }

  // ---- 步骤 2: 服务端聚合。32 强的 31 场对决 → 最多 32 行，而非 62 行 ----
  const agg = new Map();
  for (const m of matches) {
    bump(agg, m?.winner, 1, 0);
    bump(agg, m?.loser, 0, 1);
  }
  if (champion?.mid && agg.has(champion.mid)) {
    agg.get(champion.mid).champions += 1;
  }

  const rows = [...agg.values()];
  if (rows.length === 0) return json({ ok: true, upserted: 0 });

  // ---- 步骤 3: 分片多行 UPSERT，一次 batch 原子写入 ----
  const stmts = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const placeholders = slice.map(() => '(?,?,?,?,?,?,?,?,?)').join(',');
    const binds = [];
    for (const r of slice) {
      binds.push(scope, r.mid, r.type, r.title, r.subtitle, r.wins, r.losses, r.champions, now);
    }
    stmts.push(
      env.DB.prepare(
        `INSERT INTO song_stat
           (scope, item_mid, item_type, title, subtitle, wins, losses, champions, updated_at)
         VALUES ${placeholders}
         ON CONFLICT(scope, item_mid) DO UPDATE SET
           wins       = wins      + excluded.wins,
           losses     = losses    + excluded.losses,
           champions  = champions + excluded.champions,
           title      = COALESCE(excluded.title, title),
           subtitle   = COALESCE(excluded.subtitle, subtitle),
           updated_at = excluded.updated_at`
      ).bind(...binds)
    );
  }

  try {
    await env.DB.batch(stmts);
  } catch (err) {
    return json({ error: 'db_error', detail: String(err).slice(0, 200) }, 500);
  }

  return json({ ok: true, upserted: rows.length });
}

export const onRequestOptions = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
