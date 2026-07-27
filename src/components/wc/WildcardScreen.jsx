// 外卡复活浮层
import { clsx } from 'clsx';

export default function WildcardScreen({ show, groups, wildcards, onContinue }) {
  // 取每组第三名，按 seedRank 升序排列
  const thirds = groups
    .map((g, i) => ({
      group: i,
      groupName: g.name,
      entrant: g.thirdPlace,
      seedRank: g.thirdPlace.seedRank || 999,
    }))
    .sort((a, b) => a.seedRank - b.seedRank);

  return (
    <div className={clsx('wc-screen', { show })}>
      <div className="wc-panel">
        <h2>🎣 捞回 8 个</h2>
        <p className="wc-sub">12 个小组第三中，收藏量排名最优的 8 首获得外卡复活</p>
        <div className="wc-wc-grid">
          {thirds.map((r, idx) => {
            const isSelected = wildcards.some((w) => w.id === r.entrant.id);
            return (
              <div key={idx} className={clsx('wc-wc-card', { selected: isSelected })}>
                <div className="wc-rk">#{r.seedRank}</div>
                <div className="wc-song">{r.entrant.name}</div>
                <div className="wc-grp">{r.groupName}组第三</div>
              </div>
            );
          })}
        </div>
        <button className="btn primary" onClick={onContinue}>
          进入淘汰赛 →
        </button>
      </div>
    </div>
  );
}
