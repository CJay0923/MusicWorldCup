// 外卡复活浮层 — 用户自选 8 首
import { clsx } from 'clsx';

/**
 * @param {boolean} show - 是否显示
 * @param {Array} wildcardPool - 12 首小组第三名候选
 * @param {Array} wildcardPicks - 已选中的 8 首
 * @param {(entrantId: number) => void} onToggle - 切换选中状态
 * @param {() => void} onConfirm - 确认进入淘汰赛
 */
export default function WildcardScreen({
  show,
  wildcardPool = [],
  wildcardPicks = [],
  onToggle,
  onConfirm,
}) {
  // 按 seedRank 升序排列，方便用户比较
  const pool = wildcardPool
    .map((entrant, i) => ({
      entrant,
      seedRank: entrant?.seedRank || 999,
      originalIndex: i,
    }))
    .sort((a, b) => a.seedRank - b.seedRank);

  const pickedCount = wildcardPicks.length;
  const canConfirm = pickedCount === 8;
  const maxPicks = 8;

  const isPicked = (entrant) =>
    wildcardPicks.some((w) => w && entrant && w.id === entrant.id);

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[--z-wc-screen] items-center justify-center overflow-y-auto bg-[rgba(8,10,26,0.85)] p-[30px_20px] backdrop-blur-[10px]',
        show ? 'flex animate-[fade_0.3s_ease]' : 'hidden',
      )}
    >
      <div className="w-[min(860px,95vw)] max-h-[88vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-bg2 p-[30px] text-center shadow-[0_16px_56px_rgba(0,0,0,0.6)] animate-[pop_0.4s_cubic-bezier(0.22,1.3,0.36,1)]">
        <h2 className="m-0 mb-1.5 text-2xl font-black">🎣 捞回 8 个</h2>
        <p className="mb-5 mt-0 text-sm text-muted">
          从 12 个小组第三中，自选 8 首获得外卡复活
        </p>
        <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
          {pool.map((r, idx) => {
            const isSelected = isPicked(r.entrant);
            const disabled = !isSelected && pickedCount >= maxPicks;
            return (
              <div
                key={idx}
                className={clsx(
                  'cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 text-center transition-all duration-300',
                  isSelected && 'scale-105 border-good bg-good/10',
                  disabled && 'cursor-not-allowed opacity-40',
                )}
                onClick={() => !disabled && onToggle?.(r.entrant.id)}
              >
                <div
                  className={clsx(
                    'text-[10px] font-bold',
                    isSelected ? 'text-good' : 'text-accent',
                  )}
                >
                  #{r.seedRank}
                </div>
                {r.entrant?.pic && (
                  <div className="mx-1 my-1 h-[60px] w-[60px] overflow-hidden rounded-lg">
                    <img
                      className="h-full w-full object-cover"
                      src={r.entrant.pic}
                      alt="封面"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="my-0.5 text-[13px] font-bold text-white">
                  {r.entrant?.name || '—'}
                </div>
                <div className="text-[10px] text-muted">
                  {isSelected ? '✓ 已选' : disabled ? '已满' : '点击选择'}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm text-muted">
            已选 <b className="text-lg font-black text-accent">{pickedCount}</b> /{' '}
            {maxPicks}
          </span>
          <button
            className={clsx(
              'inline-flex cursor-pointer items-center gap-[7px] rounded-xl border-2 border-accent/60 bg-gradient-to-br from-accent to-[#cc2238] px-4 py-[9px] text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(230,57,70,0.3)] transition-all duration-200 hover:brightness-110 active:scale-[0.97]',
              !canConfirm && 'cursor-default opacity-50',
            )}
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {canConfirm ? '进入淘汰赛 →' : `请选满 ${maxPicks} 首`}
          </button>
        </div>
      </div>
    </div>
  );
}
