// 世界杯阶段栏：显示当前阶段 + 小组标签 / 淘汰赛轮次标签
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
    <div className="wc-bar show">
      <span className="wc-phase">{phase}</span>
      <div className="wc-group-tabs">
        {koMode ? (
          // 淘汰赛：显示 32强/16强/8强/4强/决赛 标签
          phases.map((p) => (
            <div
              key={p.n}
              className={`wc-gtab ${p.done ? 'done' : ''} ${p.current ? 'current' : ''}`}
              style={{ width: 'auto', padding: '0 8px' }}
            >
              {p.n}
            </div>
          ))
        ) : (
          // 小组赛：显示 A-L 标签
          groups.map((g, i) => (
            <div
              key={i}
              className={`wc-gtab ${g.done ? 'done' : ''} ${i === curGroup ? 'current' : ''}`}
              onClick={() => onGroupClick(i)}
            >
              {g.name}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
