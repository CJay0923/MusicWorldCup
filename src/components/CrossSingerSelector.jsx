import React from 'react';
import { clsx } from 'clsx';
import { SINGERS, SINGER_ICONS, classicOptions } from '../data/singers.js';
import { SINGER_REGISTRY } from '../data/singerRegistry.js';

/**
 * 跨歌手模式：多选歌手选择器（支持搜索额外歌手）
 */
export default function CrossSingerSelector({
  selectedSingers,
  onToggleSinger,
  singerDataMap,
  loading,
  bracketSize,
  onSelectSize,
  availableSizes,
  mode,
  crossSearchKeyword,
  onCrossSearch,
  crossSearchResults,
  isCrossSearching,
  onAddDynamicSinger,
  dynamicSingers,
  loadingMids,
}) {
  const selectedList = [...(selectedSingers || [])];
  const selectedCount = selectedList.length;
  const maxSingers = 8;
  const minSingers = 2;

  const totalSongs = selectedList.reduce((sum, id) => {
    if (id.startsWith('dyn_')) {
      const mid = id.slice(4);
      const dyn = dynamicSingers?.get(mid);
      return sum + (dyn?.data?.entrants?.length || 0);
    }
    const sd = singerDataMap[id];
    return sum + (sd?.entrants?.length || 0);
  }, 0);

  const sizes = mode === 'cross-wc'
    ? []
    : (availableSizes && availableSizes.length > 0
        ? availableSizes
        : classicOptions(Math.min(totalSongs, 128)));

  const currentSize = mode === 'cross-wc' ? 48 : (bracketSize || sizes[0] || 32);
  const perSinger = selectedCount > 0 ? Math.ceil(currentSize / selectedCount) : 0;
  const dynamicList = dynamicSingers ? [...dynamicSingers.values()] : [];

  return (
    <div className="cross-singer-selector">
      <div className="cross-header">
        <span className="cross-title">⚔️ 选择参赛歌手</span>
        <span className="cross-count">
          已选 <b>{selectedCount}</b> / {maxSingers} 位
          {selectedCount < minSingers && (
            <span className="cross-hint">（至少选 {minSingers} 位）</span>
          )}
        </span>
      </div>

      <div className="cross-singer-grid">
        {Object.keys(SINGERS).map((id) => {
          const s = SINGERS[id];
          const icon = SINGER_ICONS[id] || '🎤';
          const photo = SINGER_REGISTRY[id]?.photo;
          const isSelected = selectedSingers?.has(id);
          const sd = singerDataMap[id];
          const songCount = sd?.entrants?.length || 0;
          const isLoadingThis = loading && isSelected && !sd;

          return (
            <button
              key={id}
              className={clsx('cross-singer-btn', { active: isSelected })}
              onClick={() => onToggleSinger(id)}
              type="button"
              disabled={!isSelected && selectedCount >= maxSingers}
            >
              {photo ? (
                <img className="cs-avatar" src={photo} alt="" loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; const next = e.currentTarget.nextElementSibling; if (next) next.style.display = ''; }}
                />
              ) : null}
              <span className="cs-ico" style={{ display: photo ? 'none' : '' }}>{icon}</span>
              <span className="cs-name">{s.name}</span>
              {isSelected && (
                <span className="cs-song-count">
                  {isLoadingThis ? <i className="dsb-spin" /> : songCount > 0 ? `${songCount} 首` : ''}
                </span>
              )}
              {isSelected && <span className="cs-check">✓</span>}
            </button>
          );
        })}
      </div>

      {dynamicList.length > 0 && (
        <div className="cross-singer-grid">
          {dynamicList.map((dyn) => {
            const dynId = `dyn_${dyn.mid}`;
            const isSelected = selectedSingers?.has(dynId);
            const songCount = dyn.data?.entrants?.length || 0;
            return (
              <button key={dyn.mid} className={clsx('cross-singer-btn', 'dynamic', { active: isSelected })}
                onClick={() => onToggleSinger(dynId)} type="button"
                disabled={!isSelected && selectedCount >= maxSingers}
              >
                {dyn.photo ? <img className="cs-avatar" src={dyn.photo} alt="" loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; const next = e.currentTarget.nextElementSibling; if (next) next.style.display = ''; }} /> : null}
                <span className="cs-ico" style={{ display: dyn.photo ? 'none' : '' }}>🎤</span>
                <span className="cs-name">{dyn.name}</span>
                {isSelected && songCount > 0 && <span className="cs-song-count">{songCount} 首</span>}
                {isSelected && <span className="cs-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="cross-singer-search">
        <input type="text" className="cross-search-input" placeholder="搜索更多歌手加入混战…"
          value={crossSearchKeyword || ''} onChange={(e) => onCrossSearch?.(e.target.value)} spellCheck={false}
        />
        {isCrossSearching && <span className="cross-search-spinner">🔍</span>}
      </div>

      {crossSearchResults && crossSearchResults.length > 0 && (
        <div className="cross-search-results">
          {crossSearchResults.slice(0, 8).map((singer) => {
            const dynId = `dyn_${singer.mid}`;
            const isAdded = dynamicSingers?.has(singer.mid);
            const isSelected = selectedSingers?.has(dynId);
            const isLoading = loadingMids?.has(singer.mid);
            return (
              <button key={singer.mid} className={clsx('cross-search-item', { added: isAdded, selected: isSelected })}
                onClick={() => { if (isAdded) { onToggleSinger(dynId); } else if (!isLoading && selectedCount < maxSingers) { onAddDynamicSinger(singer); } }}
                type="button" disabled={isLoading || (!isAdded && !isSelected && selectedCount >= maxSingers)}
              >
                <img className="cross-search-avatar" src={singer.photo} alt="" loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="cross-search-name">{singer.name}</span>
                {isLoading && <i className="dsb-spin" />}
                {isAdded && !isSelected && <span className="cross-search-hint">点击选择</span>}
                {isSelected && <span className="cs-check">✓</span>}
                {!isAdded && !isLoading && <span className="cross-search-hint">+ 添加</span>}
              </button>
            );
          })}
        </div>
      )}

      {mode === 'cross-battle' && sizes.length > 0 && selectedCount >= minSingers && (
        <div className="size-selector">
          <span className="size-label">淘汰赛规模{perSinger > 0 && <small>（每位歌手约 {perSinger} 首）</small>}</span>
          <div className="size-btns">
            {sizes.map((size) => (
              <button key={size} className={clsx('size-btn', { active: currentSize === size })}
                onClick={() => onSelectSize(size)} type="button">{size}强</button>
            ))}
          </div>
        </div>
      )}

      {mode === 'cross-wc' && selectedCount >= minSingers && (
        <div className="cross-wc-info">
          <span className="size-label">赛制：12 组四选二 + 32 强淘汰赛（约 48 首参赛）</span>
        </div>
      )}

      {loading && selectedCount >= minSingers && (
        <div className="cross-loading"><i className="dsb-spin" /> 正在加载歌手数据…</div>
      )}
    </div>
  );
}
