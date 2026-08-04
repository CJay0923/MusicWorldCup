// Leaderboard.jsx — 全站人气榜（大众投票聚合）
//
// 数据来自 /api/stats/:scope（D1 + 贝叶斯平滑排序，见 functions/api/stats/[scope].js）。
// 后端不可用时 fetchStats 返回 null，组件静默降级（不显示任何内容），绝不报错或阻塞冠军页。
//
// props:
//   scope   string  歌手ID（stefanie / jj ...），用于拉取该歌手的大众榜
//   limit   number  显示条数（默认 10）

import { useEffect, useState } from 'react';
import { fetchStats } from '../lib/stats.js';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ scope, limit = 10 }) {
  const [data, setData] = useState(null); // null=加载中/无后端, {items,sessions}
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setData(null);
    if (!scope) {
      setLoading(false);
      return;
    }
    fetchStats(scope, { limit, type: 'song' })
      .then((res) => {
        if (!alive) return;
        setData(res && res.items ? res : { items: [], sessions: 0 });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [scope, limit]);

  if (loading) return null;
  if (!data || data.items.length === 0) return null;

  const maxBattles = Math.max(...data.items.map((i) => i.battles), 1);

  return (
    <section
      style={{
        marginTop: 28,
        padding: '18px 20px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, letterSpacing: '0.04em', opacity: 0.92 }}>
          全站人气榜
        </h3>
        <span style={{ fontSize: 12, opacity: 0.5 }}>
          {data.sessions} 场对决 · 实时聚合
        </span>
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {data.items.map((it) => (
          <li
            key={it.mid}
            style={{
              display: 'grid',
              gridTemplateColumns: '26px 1fr auto',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <span style={{ fontSize: 15, textAlign: 'center', opacity: 0.85 }}>
              {it.rank <= 3 ? MEDAL[it.rank - 1] : it.rank}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {it.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {it.subtitle || '—'}
              </div>
              {/* 胜率条 */}
              <div
                style={{
                  marginTop: 6,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(it.battles / maxBattles) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg,#ffd24a,#ff9d3c)',
                  }}
                />
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 700, color: '#ffd24a' }}>
                {Math.round(it.winRate * 100)}%
              </div>
              <div style={{ opacity: 0.45 }}>
                {it.wins}胜{it.losses}负
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
