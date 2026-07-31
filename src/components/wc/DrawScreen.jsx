// 抽签结果浮层
import { clsx } from 'clsx';

export default function DrawScreen({ show, groups, entrants, seedRank, onContinue }) {
  return (
    <div
      className={clsx(
        'fixed inset-0 z-[--z-wc-screen] items-center justify-center overflow-y-auto bg-[rgba(8,10,26,0.85)] p-[30px_20px] backdrop-blur-[10px]',
        show ? 'flex animate-[fade_0.3s_ease]' : 'hidden',
      )}
    >
      <div className="w-[min(860px,95vw)] max-h-[88vh] overflow-y-auto rounded-[22px] border border-white/10 bg-bg2 p-[30px] text-center shadow-[--shadow] animate-[pop_0.4s_cubic-bezier(0.22,1.3,0.36,1)]">
        <h2 className="m-0 mb-1.5 text-2xl font-black">⚽ 抽签结果</h2>
        <p className="mb-5 mt-0 text-sm text-muted">
          48 首歌已按收藏量分 4 档抽入 12 个小组，每组 1 个种子
        </p>
        <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
          {groups.map((g) => (
            <div
              key={g.name}
              className="rounded-[10px] border border-white/10 bg-white/3 px-3 py-2.5 text-left"
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-black text-accent">
                <span>{g.name}</span>
                <span className="text-[10px] font-semibold text-muted">组</span>
              </div>
              {g.members.map((idx, mi) => {
                const e = entrants[idx];
                const sr = seedRank[idx] || 999;
                return (
                  <div
                    key={mi}
                    className="flex items-center gap-1.5 py-0.5 text-xs text-[#cdd0e8]"
                  >
                    <span
                      className="min-w-[20px] rounded-[3px] bg-accent/15 px-1 py-px text-center text-[9px] font-bold text-accent"
                      style={{ visibility: sr <= 32 ? 'visible' : 'hidden' }}
                    >
                      {sr <= 32 ? `#${sr}` : ''}
                    </span>
                    <span>{e.name}</span>
                    <span className="ml-auto text-[8px] text-muted">P{mi + 1}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <button
          className="inline-flex cursor-pointer items-center gap-[7px] rounded-full border-none bg-gradient-to-br from-accent to-[#ffb13d] px-4 py-[9px] text-[13px] font-semibold text-[#2a1d00] shadow-[0_10px_30px_rgba(255,177,61,0.35)] transition-all duration-200 hover:brightness-105 active:scale-[0.97]"
          onClick={onContinue}
        >
          开始小组赛 →
        </button>
      </div>
    </div>
  );
}
