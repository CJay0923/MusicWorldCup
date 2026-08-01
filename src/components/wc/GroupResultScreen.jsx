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
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#e8eaed' }}>
              {group.runnerUp.name}
            </div>
            {group.runnerUp.isSeed && (
              <div style={{ fontSize: '11px', color: 'var(--accent)' }}>
                种子#{group.runnerUp.seedRank}
              </div>
            )}
          </div>
        </div>
        <button
          className="inline-flex cursor-pointer items-center gap-[7px] rounded-xl border-2 border-accent/60 bg-gradient-to-br from-accent to-[#cc2238] px-4 py-[9px] text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(230,57,70,0.3)] transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
          onClick={onContinue}
        >
          {allDone ? '捞回 8 个 →' : '继续下一组 →'}
        </button>
      </div>
    </div>
  );
}
