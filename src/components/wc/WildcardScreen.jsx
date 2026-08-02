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
    <div className={clsx('wc-overlay', show && 'wc-overlay--show')}>
      <div className="wc-panel wc-panel--wildcard">
        <h2 className="wc-panel-title">🎣 捞回 8 个</h2>
        <p className="wc-sub">
          从 12 个小组第三中，自选 8 首获得外卡复活
        </p>
        <div className="wc-wildcard-grid">
          {pool.map((r, idx) => {
            const isSelected = isPicked(r.entrant);
            const disabled = !isSelected && pickedCount >= maxPicks;
            return (
              <div
                key={idx}
                className={clsx(
                  'wc-wc-card',
                  isSelected && 'wc-wc-card--selected',
                  disabled && 'wc-wc-card--disabled',
                )}
                onClick={() => !disabled && onToggle?.(r.entrant.id)}
              >
                <div className={clsx('wc-wc-rank', isSelected && 'wc-wc-rank--picked')}>
                  #{r.seedRank}
                </div>
                {r.entrant?.pic && (
                  <div className="wc-wc-cover">
                    <img
                      className="h-full w-full object-cover"
                      src={r.entrant.pic}
                      alt="封面"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="wc-wc-name">{r.entrant?.name || '—'}</div>
                <div className={clsx('wc-wc-status', isSelected && 'wc-wc-status--picked')}>
                  {isSelected ? '✓ 已选' : disabled ? '已满' : '点击选择'}
                </div>
              </div>
            );
          })}
        </div>
        <div className="wc-wc-footer">
          <span className="wc-wc-count">
            已选 <b>{pickedCount}</b> / {maxPicks}
          </span>
          <button
            className={clsx(
              'wc-btn wc-btn--primary',
              !canConfirm && 'wc-btn--disabled',
            )}
            type="button"
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
