// 小组积分榜 + 比赛列表面板
import { clsx } from 'clsx';

export default function GroupStandings({ group, entrants, seedRank }) {
  // 按 wins desc, seedRank asc 排序
  const ranked = group.members
    .map((idx, mi) => ({
      idx,
      mi,
      wins: group.wins[mi],
      sr: seedRank[idx] || 999,
      e: entrants[idx],
    }))
    .sort((a, b) => b.wins - a.wins || a.sr - b.sr);

  // 轮次标签：R1/R1/R2/R2/R3/R3
  const rn = ['R1', 'R1', 'R2', 'R2', 'R3', 'R3'];

  // 计算单个 slot 的 className
  const slotClass = (mi, winIdx, isCurrent) =>
    clsx('mb-slot', {
      win: winIdx !== undefined && mi === winIdx,
      lose: winIdx !== undefined && mi !== winIdx,
      current: isCurrent,
    });

  return (
    <div className="wc-mini show">
      <div className="wc-mini-inner">
        <h4>
          <span className="gname">{group.name}组</span>
          <span>{group.curMatch}/6</span>
        </h4>
        <div className="wc-mb-list">
          {/* 积分榜 */}
          <div className="wc-standings">
            <div className="st-row st-head">
              <span className="st-rank">#</span>
              <span className="st-name">歌曲</span>
              <span className="st-wins">胜</span>
            </div>
            {ranked.map((r, i) => (
              <div key={r.idx} className={clsx('st-row', { adv: i < 2 })}>
                <span className="st-rank">{i + 1}</span>
                <span className="st-name">
                  {r.sr <= 32 && <span className="mb-seed">#{r.sr}</span>}
                  {r.e.name}
                </span>
                <span className="st-wins">{r.wins}</span>
              </div>
            ))}
          </div>

          {/* 比赛列表 */}
          {group.schedule.map((match, m) => {
            const [mi1, mi2] = match;
            const winIdx = group.results[m];
            const isCurrent = m === group.curMatch && !group.done;

            const e1 = entrants[group.members[mi1]];
            const e2 = entrants[group.members[mi2]];
            const sr1 = seedRank[group.members[mi1]] || 999;
            const sr2 = seedRank[group.members[mi2]] || 999;

            return (
              <div key={m} className="wc-mb-match">
                <span className="mb-round">{rn[m]}</span>
                <span className={slotClass(mi1, winIdx, isCurrent)}>
                  {sr1 <= 32 && <span className="mb-seed">#{sr1}</span>}
                  {e1.name}
                </span>
                <span className="mb-vs">vs</span>
                <span className={slotClass(mi2, winIdx, isCurrent)}>
                  {sr2 <= 32 && <span className="mb-seed">#{sr2}</span>}
                  {e2.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
