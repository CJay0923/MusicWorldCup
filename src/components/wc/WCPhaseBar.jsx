// 世界杯阶段栏：显示当前阶段 + 小组标签 / 淘汰赛轮次标签
import { clsx } from 'clsx';

export default function WCPhaseBar({
  phase,
  groups,
  curGroup,
  koMode,
  koCurRound,
  koPhase,
  onGroupClick,
}) {
  // 淘汰赛阶段定义：32强 / 16强 / 8强 / 4强 / 决赛
  const phases = [
    { n: '32强', done: koCurRound > 0, current: koPhase === 'r32' },
    { n: '16强', done: koCurRound > 1, current: koPhase === 'r16' },
    { n: '8强', done: koCurRound > 2, current: koPhase === 'qf' },
    { n: '4强', done: koCurRound > 3, current: koPhase === 'sf' },
    { n: '决赛', done: false, current: koPhase === 'final' },
  ];

  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
      <span className="whitespace-nowrap rounded-full border border-good/30 bg-gradient-to-br from-good/18 to-accent/12 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-good">
        {phase}
      </span>
      <div className="flex flex-1 flex-wrap gap-[3px]">
        {koMode
          ? phases.map((p) => (
              <div
                key={p.n}
                className={clsx(
                  'flex h-[26px] items-center justify-center rounded-[7px] border px-2 text-[11px] font-bold transition-all duration-200',
                  p.current
                    ? 'border-none bg-gradient-to-br from-accent to-[#ffb13d] text-[#2a1d00] shadow-[0_4px_12px_rgba(255,177,61,0.35)]'
                    : p.done
                      ? 'border-good/30 bg-good/12 text-good'
                      : 'border-white/10 bg-white/4 text-muted hover:bg-white/10 hover:text-ink',
                )}
              >
                {p.n}
              </div>
            ))
          : groups.map((g, i) => (
              <div
                key={i}
                className={clsx(
                  'flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-[7px] border text-[11px] font-bold transition-all duration-200',
                  i === curGroup
                    ? 'border-none bg-gradient-to-br from-accent to-[#ffb13d] text-[#2a1d00] shadow-[0_4px_12px_rgba(255,177,61,0.35)]'
                    : g.done
                      ? 'border-good/30 bg-good/12 text-good'
                      : 'border-white/10 bg-white/4 text-muted hover:bg-white/10 hover:text-ink',
                )}
                onClick={() => onGroupClick(i)}
              >
                {g.name}
              </div>
            ))}
      </div>
    </div>
  );
}
