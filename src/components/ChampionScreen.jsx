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
export default function ChampionScreen({
  champion,
  singerName,
  history,
  onAgain,
}) {
  // 默认展开夺冠之路
  const [showRecap, setShowRecap] = useState(true);

  // Champion name gradient based on which half they came from
  const champNameStyle =
    champion?.side === 'L'
      ? {
          background: 'linear-gradient(120deg,#fff,#ffd24a)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }
      : {
          background: 'linear-gradient(120deg,#fff,#ff8a3d)',
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
    if (tried !== 'pic' && song?.pic) { img.dataset.tried = 'pic'; img.src = song.pic; return; }
    if (tried !== 'songPic' && song?.songPic) { img.dataset.tried = 'songPic'; img.src = song.songPic; return; }
    if (tried !== 't062' && t062) { img.dataset.tried = 't062'; img.src = t062; return; }
    if (tried !== 't002' && t002) { img.dataset.tried = 't002'; img.src = t002; return; }
    img.style.display = 'none';
  };

  return (
    <section className="champion active">
      <TrophySvg size={128} />

      <div className={clsx('champ-cover-wrap', { empty: !getCover(champion) })}>
        {getCover(champion) && (
          <img
            src={getCover(champion)}
            alt="冠军专辑封面"
            onError={(e) => handleImgError(e, champion)}
          />
        )}
      </div>

      <div className="crown-label">CHAMPION</div>

      <h1 style={champNameStyle}>{champion?.name || '—'}</h1>

      <div className="winner-side">
        本届 <b>{singerName}歌曲世界杯</b> 终极冠军
      </div>

      <div className="actions">
        <button className="btn primary" onClick={onAgain} type="button">
          🔄 再战一届
        </button>
        <button className="btn" onClick={toggleRecap} type="button">
          {showRecap ? '📋 收起' : '📋 查看夺冠之路'}
        </button>
      </div>

      {showRecap && (
        <div className="recap" style={{ display: 'block' }}>
          <h3>夺冠之路</h3>
          <div className="path">
            {steps.map((s, i) => (
              <div className="step" key={i}>
                <span className="r">{s.roundName}</span>
                <div className="step-covers">
                  <div className={clsx('step-cover', { empty: !getCover(s.winner) })}>
                    {getCover(s.winner) && (
                      <img
                        src={getCover(s.winner)}
                        alt="胜者封面"
                        loading="lazy"
                        onError={(e) => handleImgError(e, s.winner)}
                      />
                    )}
                  </div>
                  <span className="step-vs">VS</span>
                  <div className={clsx('step-cover loser', { empty: !getCover(s.loser) })}>
                    {getCover(s.loser) && (
                      <img
                        src={getCover(s.loser)}
                        alt="败者封面"
                        loading="lazy"
                        onError={(e) => handleImgError(e, s.loser)}
                      />
                    )}
                  </div>
                </div>
                <div className="step-info">
                  <span className="step-winner">
                    <b>{s.winner.name}</b>
                  </span>
                  <span className="beat">
                    击败 <s>{s.loser?.name}</s>
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
