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
    <div className="wc-phase-bar">
      <span className="wc-phase-label">{phase}</span>
      <div className="wc-phase-tabs">
        {koMode
          ? phases.map((p) => (
              <div
                key={p.n}
                className={clsx(
                  'wc-phase-tab',
                  p.current && 'wc-phase-tab--active',
                  p.done && !p.current && 'wc-phase-tab--done',
                )}
              >
                {p.n}
              </div>
            ))
          : groups.map((g, i) => (
              <div
                key={i}
                className={clsx(
                  'wc-phase-tab',
                  i === curGroup && 'wc-phase-tab--active',
                  g.done && i !== curGroup && 'wc-phase-tab--done',
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
