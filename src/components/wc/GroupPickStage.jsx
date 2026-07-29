// 四选二小组赛舞台：4 张卡片网格，用户点选 2 首直接晋级
import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

/**
 * @param {object} group - 当前小组 { name, members[4], picks[], done }
 * @param {object[]} entrants - 全部参赛者数组（按 id 索引）
 * @param {(memberIdx: number) => void} onToggle - 切换某首歌的选中状态
 * @param {() => void} onConfirm - 确认晋级（已选满 2 首时自动调用）
 * @param {(entrant: object) => void} onPreview - 试听某首歌
 */
export default function GroupPickStage({
  group,
  entrants,
  onToggle,
  onConfirm,
  onPreview,
}) {
  const confirmTimerRef = useRef(null);

  // 选满 2 首后自动晋级（延迟 800ms 让用户看到选中反馈）
  useEffect(() => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    if (group && group.picks.length === 2 && !group.done) {
      confirmTimerRef.current = setTimeout(() => {
        onConfirm();
      }, 800);
    }
    return () => {
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
    };
  }, [group?.picks, group?.done, onConfirm]);

  if (!group) return null;

  const pickedCount = group.picks.length;
  const isReady = pickedCount === 2;

  // 图片 onError fallback：专辑封面 → 歌曲封面 → 空
  const handleImgError = (e, songPic) => {
    const img = e.currentTarget;
    if (songPic && img.src !== songPic) {
      img.src = songPic;
    } else {
      img.style.display = 'none';
    }
  };

  return (
    <div className="gp-stage">
      <div className="gp-head">
        <h3>
          <span className="gp-name">{group.name}</span>组 · 四选二
        </h3>
        <p className="gp-tip">从 4 首中选 2 首直接晋级，无需两两对决</p>
      </div>

      <div className="gp-grid">
        {group.members.map((idx, mi) => {
          const e = entrants[idx];
          if (!e) return null;
          const selected = group.picks.includes(mi);
          const order = selected ? group.picks.indexOf(mi) + 1 : 0;

          return (
            <div
              key={mi}
              className={clsx('gp-card', {
                selected,
                disabled: !selected && pickedCount >= 2,
              })}
              onClick={() => onToggle(mi)}
            >
              <span className="gp-seed">
                {e.isSeed ? `种子#${e.seedRank}` : `#${e.seed}`}
              </span>
              <div className={clsx('gp-art', { empty: !e.pic })}>
                {e.pic && (
                  <img
                    src={e.pic}
                    alt="专辑封面"
                    loading="lazy"
                    onError={(ev) => handleImgError(ev, e.songPic)}
                  />
                )}
              </div>
              <div className="gp-song">{e.name}</div>
              <div className="gp-pick-label">
                {selected ? `✓ 第 ${order} 个晋级` : '点击选择'}
              </div>
              {onPreview && (
                <button
                  className="card-preview-btn"
                  type="button"
                  aria-label="试听"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onPreview(e);
                  }}
                >
                  ▶ 试听
                </button>
              )}
              <div className="gp-check" style={{ opacity: selected ? 1 : 0 }}>
                ✓
              </div>
            </div>
          );
        })}
      </div>

      <div className="gp-foot">
        <span className="gp-count">
          {isReady ? (
            <span className="gp-auto-hint">✓ 已选满 2 首，即将晋级…</span>
          ) : (
            <>
              已选 <b>{pickedCount}</b> / 2
            </>
          )}
        </span>
      </div>
    </div>
  );
}
