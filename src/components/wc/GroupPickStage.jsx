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
    <div className="mt-1.5 rounded-lg border border-white/10 bg-gradient-to-br from-white/4 to-white/1 px-5 pb-[26px] pt-[22px] backdrop-blur-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_36px_rgba(0,0,0,0.25)]">
      <div className="mb-3.5 text-center">
        <h3 className="m-0 font-display text-lg font-black tracking-tight">
          <span className="mr-0.5 text-[22px] text-accent">{group.name}</span>组 · 四选二
        </h3>
        <p className="m-0 text-[12.5px] text-muted">
          从 4 首中选 2 首直接晋级，无需两两对决
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 max-[720px]:grid-cols-2">
        {group.members.map((idx, mi) => {
          const e = entrants[idx];
          if (!e) return null;
          const selected = group.picks.includes(mi);
          const order = selected ? group.picks.indexOf(mi) + 1 : 0;

          return (
            <div
              key={mi}
              className={clsx(
                'relative flex min-h-[220px] cursor-pointer flex-col items-center overflow-hidden rounded-md border border-white/12 px-3 pb-3.5 pt-[18px] text-center backdrop-blur-[8px]',
                'bg-gradient-to-br from-white/6 to-bg2/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.25)]',
                'transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'hover:-translate-y-1 hover:border-accent/45 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_30px_rgba(255,210,74,0.15)]',
                'active:translate-y-0 active:scale-[0.97]',
                selected &&
                  'border-good bg-good/6 shadow-[0_0_0_1px_var(--good),0_12px_30px_rgba(55,226,165,0.18)]',
                !selected &&
                  pickedCount >= 2 &&
                  'cursor-not-allowed opacity-40 hover:translate-y-0 hover:border-white/10 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.2)]',
              )}
              onClick={() => onToggle(mi)}
            >
              <span
                className={clsx(
                  'absolute right-3 top-2.5 text-[10px] font-bold',
                  selected ? 'text-good' : 'text-muted',
                )}
              >
                {e.isSeed ? `种子#${e.seedRank}` : `#${e.seed}`}
              </span>
              <div
                className={clsx(
                  'relative mb-2.5 mt-1.5 flex h-[78px] w-[78px] items-center justify-center overflow-hidden rounded-xl bg-white/4',
                  !e.pic && 'before:text-[28px] before:text-muted before:content-["♪"]',
                  selected && 'shadow-[0_0_0_2px_rgba(55,226,165,0.4)]',
                )}
              >
                {e.pic && (
                  <img
                    className="h-full w-full object-cover"
                    src={e.pic}
                    alt="专辑封面"
                    loading="lazy"
                    onError={(ev) => handleImgError(ev, e.songPic)}
                  />
                )}
              </div>
              <div className="mb-1.5 break-words text-sm font-extrabold leading-snug">
                {e.name}
              </div>
              <div
                className={clsx(
                  'mt-auto text-[11px] font-semibold tracking-wide',
                  selected ? 'font-extrabold text-good' : 'text-muted',
                )}
              >
                {selected ? `✓ 第 ${order} 个晋级` : '点击选择'}
              </div>
              {onPreview && (
                <button
                  className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-white/6 px-[11px] py-[5px] text-[11px] font-bold text-ink transition-all duration-200 hover:border-accent/55 hover:bg-white/12 hover:text-accent hover:-translate-y-px"
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
              <div
                className={clsx(
                  'pointer-events-none absolute left-3 top-2.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-good text-[13px] font-black text-bg transition-opacity duration-200',
                  selected ? 'opacity-100' : 'opacity-0',
                )}
              >
                ✓
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-[18px] flex flex-wrap items-center justify-center gap-[18px]">
        <span className="text-sm tracking-wide text-muted">
          {isReady ? (
            <span className="font-semibold text-good">✓ 已选满 2 首，即将晋级…</span>
          ) : (
            <>
              已选 <b className="text-lg font-black text-accent">{pickedCount}</b> / 2
            </>
          )}
        </span>
      </div>
    </div>
  );
}
