import React, { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { getAlbumGroups } from '../data/singers.js';

/**
 * 按专辑分组的歌曲选择器（自选模式）
 * 采用 Music Cup 风格的卡片网格布局：大封面 + 歌名 + 选中勾选 + 试听按钮
 * @param {object[]} entrants - 当前歌手的全部歌曲 entrant 数组
 * @param {Set<number>} selectedIds - 已选中的 entrant id 集合
 * @param {(ids: Set<number>) => void} onChange - 选中变化回调
 * @param {number} selectedSize - 当前选择的规模（固定，由上层传入）
 * @param {(size: number) => void} onSelectSize - 规模选择回调（已废弃，保留兼容）
 * @param {(entrant: object) => void} onPreview - 试听回调
 * @param {number|null} playingId - 当前正在播放的 entrant.id
 * @param {boolean} previewLoading - 试听加载中
 * @param {boolean} isPlaying - 是否正在播放
 */
export default function SongPicker({
  entrants,
  selectedIds,
  onChange,
  selectedSize,
  onSelectSize,
  onPreview,
  playingId,
  previewLoading,
  isPlaying,
}) {
  const [search, setSearch] = useState('');
  const [collapsedAlbums, setCollapsedAlbums] = useState(new Set());
  const [expandedDesc, setExpandedDesc] = useState(new Set());

  // 按专辑分组
  const albums = useMemo(() => getAlbumGroups(entrants || []), [entrants]);

  // 搜索过滤
  const filteredAlbums = useMemo(() => {
    if (!search.trim()) return albums;
    const q = search.trim().toLowerCase();
    return albums
      .map((alb) => ({
        ...alb,
        songs: alb.songs.filter((s) => s.name.toLowerCase().includes(q)),
      }))
      .filter((alb) => alb.songs.length > 0);
  }, [albums, search]);

  const selectedCount = selectedIds.size;
  const targetSize = selectedSize || 4;
  const isReady = selectedCount >= targetSize;

  // 切换单首歌曲选中
  const toggleSong = useCallback(
    (id) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(next);
    },
    [selectedIds, onChange],
  );

  // 切换专辑全选/取消
  const toggleAlbum = useCallback(
    (songs) => {
      const allSelected = songs.every((s) => selectedIds.has(s.id));
      const next = new Set(selectedIds);
      if (allSelected) {
        songs.forEach((s) => next.delete(s.id));
      } else {
        songs.forEach((s) => next.add(s.id));
      }
      onChange(next);
    },
    [selectedIds, onChange],
  );

  // 全选 / 清空
  const selectAll = useCallback(() => {
    onChange(new Set(entrants.map((e) => e.id)));
  }, [entrants, onChange]);

  const clearAll = useCallback(() => {
    onChange(new Set());
  }, [onChange]);

  // 折叠/展开专辑
  const toggleCollapse = useCallback((pic) => {
    setCollapsedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(pic)) next.delete(pic);
      else next.add(pic);
      return next;
    });
  }, []);

  // 展开/收起专辑简介
  const toggleDesc = useCallback((pic) => {
    setExpandedDesc((prev) => {
      const next = new Set(prev);
      if (next.has(pic)) next.delete(pic);
      else next.add(pic);
      return next;
    });
  }, []);

  return (
    <div className="song-picker">
      {/* 工具栏 */}
      <div className="picker-toolbar">
        <div className="picker-stats">
          <span className={clsx('picker-count', isReady ? 'ok' : 'warn')}>
            已选 <b>{selectedCount}</b> / {targetSize} 首
          </span>
          {isReady && selectedCount > targetSize && (
            <span className="picker-hint">
              超出 <b>{selectedCount - targetSize}</b> 首 · 按热度取前 <b>{targetSize}</b>{' '}
              首
            </span>
          )}
          {!isReady && (
            <span className="picker-hint">
              还需 <b>{targetSize - selectedCount}</b> 首
            </span>
          )}
        </div>
        <div className="picker-actions">
          <button className="btn ghost small" type="button" onClick={selectAll}>
            全选
          </button>
          <button
            className="btn ghost small"
            type="button"
            onClick={clearAll}
            disabled={selectedCount === 0}
          >
            清空
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <input
        className="picker-search"
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索歌曲名…"
        spellCheck={false}
      />

      {/* 专辑列表 - 卡片网格布局 */}
      <div className="album-card-list">
        {filteredAlbums.map((alb, ai) => {
          const pic = alb.pic || '';
          const albumName = alb.name || `未分类 ${ai + 1}`;
          const albumDesc = alb.desc || '';
          const albumDate = alb.date || '';
          const albumCompany = alb.company || '';
          const albumSelected = alb.songs.filter((s) => selectedIds.has(s.id)).length;
          const allSelected = albumSelected === alb.songs.length;
          const isCollapsed = collapsedAlbums.has(pic);
          const isDescExpanded = expandedDesc.has(pic);
          const hasDesc = albumDesc.length > 0;

          return (
            <div key={pic || `album-${ai}`} className="album-section">
              {/* 专辑头部 */}
              <div className="album-section-header" onClick={() => toggleCollapse(pic)}>
                <div className="album-section-thumb">
                  {pic ? (
                    <img src={pic} alt="" loading="lazy" />
                  ) : (
                    <div className="album-section-placeholder">🎵</div>
                  )}
                </div>
                <div className="album-section-info">
                  <span className="album-section-name">{albumName}</span>
                  <span className="album-section-count">
                    {albumDate ? `${albumDate} · ` : ''}
                    {albumSelected}/{alb.songs.length} 首
                  </span>
                </div>
                <button
                  className={clsx('album-section-toggle', { all: allSelected })}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAlbum(alb.songs);
                  }}
                >
                  {allSelected ? '取消' : '全选'}
                </button>
                <span
                  className={clsx('album-section-collapse', { collapsed: isCollapsed })}
                >
                  {isCollapsed ? '▸' : '▾'}
                </span>
              </div>

              {/* 专辑简介 */}
              {!isCollapsed && hasDesc && (
                <div className="album-section-desc-wrap">
                  <div
                    className={clsx('album-section-desc', { expanded: isDescExpanded })}
                    onClick={() => toggleDesc(pic)}
                  >
                    {albumDesc}
                  </div>
                  <button
                    className="album-desc-toggle"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDesc(pic);
                    }}
                  >
                    {isDescExpanded ? '收起' : '展开简介'}
                  </button>
                </div>
              )}

              {/* 歌曲卡片网格 */}
              {!isCollapsed && (
                <div className="song-card-grid">
                  {alb.songs.map((song, k) => {
                    const isSelected = selectedIds.has(song.id);
                    // 未分类组用每首歌自己的歌曲封面，专辑组用专辑封面
                    const songArt = alb.isMisc ? (song.songPic || song.pic || '') : (pic || '');
                    const handleArtError = (e) => {
                      const img = e.currentTarget;
                      if (alb.isMisc && song.pic && img.src !== song.pic) {
                        img.src = song.pic;
                      } else {
                        img.style.display = 'none';
                      }
                    };
                    const isThisPlaying = playingId === song.id;
                    const showPause = isThisPlaying && isPlaying && !previewLoading;
                    const showSpinner = isThisPlaying && previewLoading;
                    return (
                      <div
                        key={song.id}
                        className={clsx('song-card', { picked: isSelected, playing: isThisPlaying })}
                        onClick={() => toggleSong(song.id)}
                        role="button"
                        tabIndex={0}
                        style={{ animationDelay: `${Math.min(k * 30, 500)}ms` }}
                      >
                        <div className="song-card-art">
                          {songArt ? (
                            <img src={songArt} alt="" loading="lazy" onError={handleArtError} />
                          ) : (
                            <div className="song-card-noart">🎵</div>
                          )}
                          <div className="song-card-check">✓</div>
                          {onPreview && (
                            <button
                              className="song-card-preview"
                              type="button"
                              aria-label={showPause ? '暂停' : '试听'}
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreview(song);
                              }}
                            >
                              {showSpinner ? (
                                <span className="song-card-spin" />
                              ) : showPause ? (
                                '⏸'
                              ) : (
                                '▶'
                              )}
                            </button>
                          )}
                        </div>
                        <div className="song-card-name">{song.name}</div>
                        {(song.itunesTrackUrl || song.songmid) && (
                          <a
                            className="song-card-original"
                            href={song.itunesTrackUrl || `https://y.qq.com/n/ryqq/songDetail/${song.songmid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ♪ 听原曲
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
