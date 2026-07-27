// 小组完赛结果浮层
import { clsx } from 'clsx';

export default function GroupResultScreen({ show, group, allDone, onContinue }) {
  return (
    <div className={clsx('wc-screen', { show })}>
      <div className="wc-panel">
        <h2>{group.name}组完赛</h2>
        <p className="wc-sub">
          小组前 2 名出线：{group.winner.name} · {group.runnerUp.name}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '36px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--good)',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              🥇 小组第一 · 出线
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>{group.winner.name}</div>
            {group.winner.isSeed && (
              <div style={{ fontSize: '11px', color: 'var(--accent)' }}>
                种子#{group.winner.seedRank}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--muted)',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              🥈 小组第二 · 出线
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#cdd0e8' }}>
              {group.runnerUp.name}
            </div>
            {group.runnerUp.isSeed && (
              <div style={{ fontSize: '11px', color: 'var(--accent)' }}>
                种子#{group.runnerUp.seedRank}
              </div>
            )}
          </div>
        </div>
        <button className="btn primary" onClick={onContinue}>
          {allDone ? '捞回 8 个 →' : '继续下一组 →'}
        </button>
      </div>
    </div>
  );
}
