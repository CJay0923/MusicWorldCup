import React, { useState } from 'react';
import TrophySvg from './TrophySvg.jsx';
import Confetti from './Confetti.jsx';

/**
 * Champion display screen.
 * @param {object} champion - {name, pic, side, id}
 * @param {string} singerName - singer name for the winner-side text
 * @param {Array} history - array of {roundName, winner, loser}
 * @param {() => void} onAgain - called when the "再战一届" button is clicked
 * @param {React.RefObject<HTMLCanvasElement>} confettiRef - ref for the confetti canvas
 */
export default function ChampionScreen({ champion, singerName, history, onAgain, confettiRef }) {
  const [showRecap, setShowRecap] = useState(false);

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
    (h) => h.winner && champion && h.winner.id === champion.id
  );

  const toggleRecap = () => setShowRecap((v) => !v);

  return (
    <section className="champion active">
      <Confetti active canvasRef={confettiRef} />

      <TrophySvg size={128} />

      <div className={`champ-cover-wrap${champion?.pic ? '' : ' empty'}`}>
        {champion?.pic && <img src={champion.pic} alt="冠军专辑封面" />}
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
                <span>
                  <b>{s.winner.name}</b>
                </span>
                <span className="beat">
                  击败 <s>{s.loser?.name}</s>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
