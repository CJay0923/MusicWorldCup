// 抽签结果浮层
import { clsx } from 'clsx';

export default function DrawScreen({ show, groups, entrants, seedRank, onContinue }) {
  return (
    <div className={clsx('wc-screen', { show })}>
      <div className="wc-panel">
        <h2>⚽ 抽签结果</h2>
        <p className="wc-sub">48 首歌已按收藏量分 4 档抽入 12 个小组，每组 1 个种子</p>
        <div className="wc-draw-grid">
          {groups.map((g) => (
            <div key={g.name} className="wc-draw-group">
              <div className="gd-head">
                <span>{g.name}</span>
                <span className="gd-num">组</span>
              </div>
              {g.members.map((idx, mi) => {
                const e = entrants[idx];
                const sr = seedRank[idx] || 999;
                return (
                  <div key={mi} className="gd-item">
                    <span
                      className="gd-seed"
                      style={{ visibility: sr <= 32 ? 'visible' : 'hidden' }}
                    >
                      {sr <= 32 ? `#${sr}` : ''}
                    </span>
                    <span>{e.name}</span>
                    <span className="gd-pot">P{mi + 1}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <button className="btn primary" onClick={onContinue}>
          开始小组赛 →
        </button>
      </div>
    </div>
  );
}
