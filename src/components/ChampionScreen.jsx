import React, { useState } from 'react';
import { clsx } from 'clsx';
import TrophySvg from './TrophySvg.jsx';
import Leaderboard from './Leaderboard.jsx';
import { coverUrl, jsDelivrCoverUrl, qqCoverUrl } from '../lib/assets';

/**
 * Champion display screen.
 * @param {object} champion - {name, pic, side, id}
 * @param {string} singerName - singer name for the winner-side text
 * @param {Array} history - array of {roundName, winner, loser}
 * @param {() => void} onAgain - called when the "再战一届" button is clicked
 */
export default function ChampionScreen({ champion, singerName, history, onAgain, onReset, playstyle, scope }) {
  // 默认展开夺冠之路
  const [showRecap, setShowRecap] = useState(true);

  // Champion name color based on which half they came from (实色，无渐变)
  const champColor = champion?.side === 'L' ? 'var(--color-accent)' : 'var(--color-side-right)';

  const champNameStyle = {
    color: champColor,
    fontWeight: 900,
    letterSpacing: '0.04em',
  };

  // Champion's path: matches where champion was the winner
  const steps = (history || []).filter(
    (h) => h.winner && champion && h.winner.id === champion.id,
  );

  const toggleRecap = () => setShowRecap((v) => !v);

  // 封面图获取：jsDelivr（picLocal）→ pic → GitHub raw（不调外部音乐 API）
  const getCover = (song) => {
    if (!song) return '';
    return song.picLocal || (song.albumMid ? coverUrl(song.albumMid) : '') || song.pic || '';
  };

  // 图片 onError：同源 → jsDelivr → QQ CDN（动态歌手兜底）→ 隐藏
  const handleImgError = (e, song) => {
    const img = e.currentTarget;
    const tried = img.dataset.tried || '';
    if (tried.includes('qq')) { img.style.display = 'none'; return; }
    if (tried === 'jsdelivr') { img.dataset.tried = 'jsdelivr,qq'; if (song?.albumMid) img.src = qqCoverUrl(song.albumMid); else img.style.display = 'none'; return; }
    if (!tried) { img.dataset.tried = 'jsdelivr'; if (song?.albumMid) img.src = jsDelivrCoverUrl(song.albumMid); else img.style.display = 'none'; return; }
    img.style.display = 'none';
  };

  return (
    <section className="block animate-[fade_0.5s_ease] px-2.5 py-8 text-center">
      <TrophySvg size={128} />

      {/* 冠军封面 */}
      {getCover(champion) && (
        <div className="relative mx-auto mb-1.5 mt-4 h-[150px] w-[150px]">
          <img
            className="h-full w-full rounded-xl border-2 border-white/10 object-cover shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            src={getCover(champion)}
            alt="冠军专辑封面"
            onError={(e) => handleImgError(e, champion)}
          />
        </div>
      )}

      <div className="mt-3.5 inline-block rounded-full border border-accent/40 bg-accent/[0.12] px-4 py-1.5 text-xs font-extrabold tracking-[3px] text-accent">
        CHAMPION
      </div>

      <h1
        className="mx-0 mb-2 mt-3.5 text-[clamp(40px,9vw,80px)] font-black leading-[1.1] tracking-normal text-balance"
        style={champNameStyle}
      >
        {champion?.name || '—'}
      </h1>

      <div className="mb-6 text-sm text-muted">
        本届 <b className="text-ink">{singerName}歌曲世界杯</b> 终极冠军
      </div>

      {/* 打法称号 */}
      {playstyle && (
        <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent/[0.08] px-4 py-2">
          <span className="text-xl">{playstyle.icon}</span>
          <div className="flex flex-col text-left">
            <span className="font-display text-[14px] font-black tracking-wide text-accent">
              {playstyle.title}
            </span>
            <span className="text-[11px] text-muted">{playstyle.desc}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {onReset && (
          <button
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.05] px-4 py-2 text-[13px] font-semibold text-white/80 transition-all duration-200 hover:border-white/30 hover:bg-white/[0.1] active:scale-[0.96]"
            onClick={onReset}
            type="button"
          >
            🏠 返回首页
          </button>
        )}
        <button
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-white/15 bg-white/[0.05] px-4 py-2 text-[13px] font-semibold text-ink transition-all duration-200 hover:border-white/30 hover:bg-white/[0.1] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]"
          onClick={onAgain}
          type="button"
        >
          🔄 再战一届
        </button>
        <button
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.96]"
          onClick={toggleRecap}
          type="button"
        >
          {showRecap ? '📋 收起' : '📋 查看夺冠之路'}
        </button>
      </div>

      {showRecap && (
        <div className="mx-auto mt-8 max-w-[640px] text-left">
          <h3 className="mb-3 mt-0 text-center text-[13px] tracking-[2px] text-muted">
            夺冠之路
          </h3>
          <div className="flex flex-col gap-2">
            {steps.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13.5px]"
              >
                <span className="min-w-[46px] text-[11px] font-extrabold text-accent">
                  {s.roundName}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <div
                    className={clsx(
                      'h-10 w-10 shrink-0 overflow-hidden rounded-lg border-[1.5px] border-accent/60',
                      !getCover(s.winner) &&
                        'flex items-center justify-center bg-white/6 text-muted',
                    )}
                  >
                    {getCover(s.winner) ? (
                      <img
                        className="h-full w-full object-cover"
                        src={getCover(s.winner)}
                        alt="胜者封面"
                        loading="lazy"
                        onError={(e) => handleImgError(e, s.winner)}
                      />
                    ) : (
                      '♪'
                    )}
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wide text-muted">
                    VS
                  </span>
                  <div
                    className={clsx(
                      'h-10 w-10 shrink-0 overflow-hidden rounded-lg border-[1.5px] border-white/12 opacity-55',
                      !getCover(s.loser) &&
                        'flex items-center justify-center bg-white/6 text-muted',
                    )}
                  >
                    {getCover(s.loser) ? (
                      <img
                        className="h-full w-full object-cover"
                        src={getCover(s.loser)}
                        alt="败者封面"
                        loading="lazy"
                        onError={(e) => handleImgError(e, s.loser)}
                      />
                    ) : (
                      '♪'
                    )}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm text-ink">
                  <b>{s.winner.name}</b>
                </span>
                  <span className="text-xs text-muted">
                    击败 <s className="text-muted/70">{s.loser?.name}</s>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Leaderboard scope={scope} />
    </section>
  );
}
