/**
 * GET /api/stats/:scope?limit=20&type=song
 *
 * 返回该 scope 下的"大众榜"。
 *
 * 排序用贝叶斯平滑而非裸胜率 —— 否则「1 胜 0 负 = 100%」会永远霸榜，
 * 榜单毫无意义。先验设为 5 场 50%，样本越少越被拉向中位。
 *
 * 结果用 Cache API 缓存 60s：榜单不需要实时，
 * 且能把 D1 读行数配额（500 万/天）的消耗压到几乎为零。
 */

const PRIOR_COUNT = 5.0;   // 先验样本量
const PRIOR_RATE = 0.5;    // 先验胜率
const MIN_BATTLES = 2;     // 少于这么多场不进榜
const CACHE_TTL = 60;

export async function onRequestGet({ request, env, params }) {
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'db_unbound' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const scope = decodeURIComponent(params.scope || '').slice(0, 128);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 100);
  const type = url.searchParams.get('type');

  if (!scope) {
    return new Response(JSON.stringify({ error: 'bad_scope' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 归一化缓存键，避免 ?a=1&limit=20 与 ?limit=20 各占一份缓存
  const cacheKey = new Request(
    `${url.origin}/api/stats/${encodeURIComponent(scope)}?limit=${limit}&type=${type || 'all'}`,
    { method: 'GET' }
  );
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const where = type ? 'scope = ? AND item_type = ?' : 'scope = ?';
  const binds = type ? [scope, type] : [scope];

  const sql = `
    SELECT item_mid, item_type, title, subtitle, wins, losses, champions,
           (wins + ${PRIOR_COUNT} * ${PRIOR_RATE}) / (wins + losses + ${PRIOR_COUNT}) AS score
    FROM song_stat
    WHERE ${where} AND (wins + losses) >= ${MIN_BATTLES}
    ORDER BY score DESC, wins DESC
    LIMIT ?`;

  let rows;
  let totals;
  try {
    const [r, t] = await env.DB.batch([
      env.DB.prepare(sql).bind(...binds, limit),
      env.DB.prepare(
        `SELECT COUNT(*) AS sessions FROM game_session WHERE scope = ?`
      ).bind(scope),
    ]);
    rows = r.results || [];
    totals = t.results?.[0] || { sessions: 0 };
  } catch (err) {
    return new Response(JSON.stringify({ error: 'db_error', detail: String(err).slice(0, 200) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = {
    scope,
    sessions: totals.sessions,
    items: rows.map((r, i) => ({
      rank: i + 1,
      mid: r.item_mid,
      type: r.item_type,
      title: r.title,
      subtitle: r.subtitle,
      wins: r.wins,
      losses: r.losses,
      champions: r.champions,
      battles: r.wins + r.losses,
      winRate: r.wins + r.losses > 0 ? +(r.wins / (r.wins + r.losses)).toFixed(3) : 0,
      score: +r.score.toFixed(4),
    })),
  };

  const res = new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
    },
  });

  await cache.put(cacheKey, res.clone());
  return res;
}
