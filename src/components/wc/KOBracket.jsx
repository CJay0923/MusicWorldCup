// 渲染淘汰赛单个对阵 slot
import { clsx } from 'clsx';

function koSlot(s, w, cur) {
  const isWin = w && s && s.id === w.id;
  return (
    <span
      className={clsx(
        'ko-slot',
        isWin && 'ko-slot--win',
        cur && 'ko-slot--current',
        !s && 'ko-slot--empty',
      )}
    >
      {s && s.isSeed && (
        <span className="ko-seed-tag">#{s.seedRank}</span>
      )}
      {s ? s.name : '待定'}
    </span>
  );
}

// 淘汰赛对阵总览
export default function KOBracket({ ko }) {
  const rn = ['32强（32→16）', '16强（16→8）', '8强（8→4）', '4强（4→2）', '决赛'];
  const rounds = ko.rounds;

  return (
    <div className="ko-bracket">
      {rn.map((name, r) => {
        const matches = rounds[r].length / 2;
        return (
          <div key={r} className="ko-round">
            <div className="ko-round-name">{name}</div>
            {Array.from({ length: matches }).map((_, m) => {
              const a = rounds[r][m * 2];
              const b = rounds[r][m * 2 + 1];
              const w = r < 4 ? rounds[r + 1][m] : null;
              const cur = r === ko.curRound && m === ko.curMatch;
              return (
                <div key={m} className="ko-match">
                  {koSlot(a, w, cur)}
                  <span className="ko-vs">vs</span>
                  {koSlot(b, w, cur)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
