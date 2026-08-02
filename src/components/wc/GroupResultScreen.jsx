// 小组完赛结果浮层
import { clsx } from 'clsx';

export default function GroupResultScreen({ show, group, allDone, onContinue }) {
  return (
    <div className={clsx('wc-overlay', show && 'wc-overlay--show')}>
      <div className="wc-panel">
        <h2 className="wc-panel-title">{group.name}组完赛</h2>
        <p className="wc-sub">
          小组前 2 名出线：{group.winner.name} · {group.runnerUp.name}
        </p>
        <div className="wc-result-rows">
          <div className="wc-result-row">
            <div className="wc-result-label wc-result-label--gold">🥇 小组第一 · 出线</div>
            <div className="wc-result-name">{group.winner.name}</div>
            {group.winner.isSeed && (
              <div className="wc-seed-info">种子#{group.winner.seedRank}</div>
            )}
          </div>
          <div className="wc-result-row">
            <div className="wc-result-label wc-result-label--silver">🥈 小组第二 · 出线</div>
            <div className="wc-result-name">{group.runnerUp.name}</div>
            {group.runnerUp.isSeed && (
              <div className="wc-seed-info">种子#{group.runnerUp.seedRank}</div>
            )}
          </div>
        </div>
        <button
          className="wc-btn wc-btn--primary"
          type="button"
          onClick={onContinue}
        >
          {allDone ? '捞回 8 个 →' : '继续下一组 →'}
        </button>
      </div>
    </div>
  );
}
