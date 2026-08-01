import React, { useState } from 'react';
import { clsx } from 'clsx';
import TrophySvg from './TrophySvg.jsx';

/**
 * Champion display screen.
 * @param {object} champion - {name, pic, side, id}
 * @param {string} singerName - singer name for the winner-side text
 * @param {Array} history - array of {roundName, winner, loser}
 * @param {() => void} onAgain - called when the "再战一届" button is clicked
 */
export default function ChampionScreen({ champion, singerName, history, onAgain }) {
  // 默认展开夺冠之路
  const [showRecap, setShowRecap] = useState(true);

  // Champion name gradient based on which half they came from
  const champNameStyle =
    champion?.side === 'L'
      ? {
          background: 'linear-gradient(120deg,#1a1a1a,#e63946)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }
      : {
          background: 'linear-gradient(120deg,#1a1a1a,#ffb627)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        };

  // Champion's path: matches where champion was the winner
  const steps = (history || []).filter(
    (h) => h.winner && champion && h.winner.id === champion.id,
  );

  const toggleRecap = () => setShowRecap((v) => !v);

  // 封面图获取：本地 → pic → songPic → T062 CDN → T002 CDN
  const getCover = (song) => {
    if (!song) return '';
    const t062 = song.songmid
      ? `https://y.gtimg.cn/music/photo_new/T062R300x300M000${song.songmid}.jpg`
      : '';
    const t002 = song.albumMid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albumMid}.jpg`
      : '';
    return song.picLocal || song.pic || song.songPic || t062 || t002 || '';
  };

  // 图片 onError fallback
  const handleImgError = (e, song) => {
    const img = e.currentTarget;
    const tried = img.dataset.tried || '';
    const t062 = song?.songmid
      ? `https://y.gtimg.cn/music/photo_new/T062R300x300M000${song.songmid}.jpg`
      : '';
    const t002 = song?.albumMid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albumMid}.jpg`
      : '';
    if (tried !== 'pic' && song?.pic) {
      img.dataset.tried = 'pic';
      img.src = song.pic;
      return;
    }
    if (tried !== 'songPic' && song?.songPic) {
      img.dataset.tried = 'songPic';
      img.src = song.songPic;
      return;
    }
    if (tried !== 't062' && t062) {
      img.dataset.tried = 't062';
      img.src = t062;
      return;
    }
    if (tried !== 't002' && t002) {
      img.dataset.tried = 't002';
      img.src = t002;
      return;
    }
    img.style.display = 'none';
  };

  return (
    <section className="block animate-[fade_0.5s_ease] px-2.5 py-[30px] text-center">
      <TrophySvg size={128} />

      {/* 冠军封面 */}
      {getCover(champion) && (
        <div className="relative mx-auto mb-1.5 mt-4 h-[150px] w-[150px]">
          <img
            className="h-full w-full rounded-xl border-2 border-white/10 object-cover shadow-[0_8px_28px_rgba(0,0,0,0.5)]"
            src={getCover(champion)}
            alt="冠军专辑封面"
            onError={(e) => handleImgError(e, champion)}
          />
          <div className="absolute -inset-2 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(230,57,70,0.2),transparent_35%,rgba(255,182,39,0.2),transparent_70%)] opacity-60 [animation-duration:4s]" />
        </div>
      )}

      <div className="mt-3.5 inline-block rounded-full border border-accent/40 bg-accent/[0.12] px-4 py-1.5 text-xs font-extrabold tracking-[3px] text-accent">
        CHAMPION
      </div>

      <h1
        className="mx-0 mb-2 mt-3.5 bg-clip-text font-display text-[clamp(40px,9vw,80px)] font-black leading-[1.1] tracking-wide text-transparent text-balance"
        style={champNameStyle}
      >
        {champion?.name || '—'}
      </h1>

      <div className="mb-[26px] text-sm text-white/50">
        本届 <b className="text-white">{singerName}歌曲世界杯</b> 终极冠军
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          className="inline-flex cursor-pointer items-center gap-[7px] rounded-xl border-2 border-accent/60 bg-gradient-to-br from-accent to-[#cc2238] px-4 py-[9px] text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(230,57,70,0.3)] transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
          onClick={onAgain}
          type="button"
        >
          🔄 再战一届
        </button>
        <button
          className="inline-flex cursor-pointer items-center gap-[7px] rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-[9px] text-[13px] font-semibold text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.96]"
          onClick={toggleRecap}
          type="button"
        >
          {showRecap ? '📋 收起' : '📋 查看夺冠之路'}
        </button>
      </div>

      {showRecap && (
        <div className="mx-auto mt-[34px] max-w-[640px] text-left">
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
                      'h-[38px] w-[38px] shrink-0 overflow-hidden rounded-lg border-[1.5px] border-accent/60 shadow-[0_0_8px_rgba(255,210,74,0.25)]',
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
                      'h-[38px] w-[38px] shrink-0 overflow-hidden rounded-lg border-[1.5px] border-white/12 opacity-55',
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
                  <span className="truncate text-sm text-white">
                    <b>{s.winner.name}</b>
                  </span>
                  <span className="text-xs text-muted">
                    击败 <s className="text-white/30">{s.loser?.name}</s>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
