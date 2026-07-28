import React from 'react';
import { clsx } from 'clsx';
import { SINGER_ICONS } from '../data/singers.js';
import { SINGER_REGISTRY } from '../data/singerRegistry.js';

/**
 * Singer selection button group.
 * @param {object} singers - SINGERS object mapping id -> singer data
 * @param {string} current - currently selected singer id
 * @param {(id: string) => void} onSelect - callback when a singer is selected
 */
export default function SingerSelector({ singers, current, onSelect }) {
  return (
    <div className="singer-select">
      {Object.keys(singers).map((id) => {
        const s = singers[id];
        const icon = SINGER_ICONS[id] || '🎤';
        const photo = s?.singerPhoto || SINGER_REGISTRY[id]?.photo;
        return (
          <button
            key={id}
            className={clsx('singer-btn', { active: id === current })}
            onClick={() => onSelect(id)}
            type="button"
          >
            {photo ? (
              <img
                className="sg-avatar"
                src={photo}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const next = e.currentTarget.nextElementSibling;
                  if (next) next.style.display = '';
                }}
              />
            ) : null}
            <span className="sg-ico" style={{ display: photo ? 'none' : '' }}>
              {icon}
            </span>
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
