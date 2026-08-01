// 渲染淘汰赛单个对阵 slot
import { clsx } from 'clsx';

function koSlot(s, w, cur) {
  const isWin = w && s && s.id === w.id;
  return (
    <span
      className={clsx(
        'flex-1 rounded px-1.5 py-[3px] text-xs',
        isWin ? 'bg-good/10 font-semibold text-good' : 'bg-white/[0.03] text-white/45',
        cur && 'border border-accent bg-accent/10',
        !s && 'text-muted opacity-40',
      )}
    >
      {s && s.isSeed && (
        <span className="mr-1 rounded-[3px] bg-accent/20 px-1 py-px text-[9px] font-bold text-accent">
          #{s.seedRank}
        </span>
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
    <div className="mt-3.5 block">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-xs shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
        {rn.map((name, r) => {
          const matches = rounds[r].length / 2;
          return (
            <div key={r} className="mb-2.5 last:mb-0">
              <div className="mb-1 text-[11px] font-bold text-accent">{name}</div>
              {Array.from({ length: matches }).map((_, m) => {
                const a = rounds[r][m * 2];
                const b = rounds[r][m * 2 + 1];
                const w = r < 4 ? rounds[r + 1][m] : null;
                const cur = r === ko.curRound && m === ko.curMatch;
                return (
                  <div key={m} className="flex items-center gap-1.5 py-0.5">
                    {koSlot(a, w, cur)}
                    <span className="shrink-0 text-[10px] text-muted">vs</span>
                    {koSlot(b, w, cur)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
