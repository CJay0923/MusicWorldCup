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
    <div className="mx-auto mb-6 max-w-[760px] rounded-2xl border border-white/10 bg-white/4 p-[18px_20px] backdrop-blur-[8px]">
      {/* 工具栏 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className={clsx('text-sm', isReady ? 'text-muted' : 'text-muted')}>
            已选{' '}
            <b className={clsx('text-base', isReady ? 'text-good' : 'text-accent2')}>
              {selectedCount}
            </b>{' '}
            / {targetSize} 首
          </span>
          {isReady && selectedCount > targetSize && (
            <span className="text-xs text-muted">
              超出 <b className="text-accent">{selectedCount - targetSize}</b> 首 ·
              按热度取前 <b className="text-accent">{targetSize}</b> 首
            </span>
          )}
          {!isReady && (
            <span className="text-xs text-muted">
              还需 <b className="text-accent">{targetSize - selectedCount}</b> 首
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="cursor-pointer rounded-md border border-white/10 bg-transparent px-2.5 py-1 text-[11px] font-semibold text-ink transition-all duration-200 hover:border-white/25 hover:bg-white/10 active:scale-[0.96]"
            type="button"
            onClick={selectAll}
          >
            全选
          </button>
          <button
            className="cursor-pointer rounded-md border border-white/10 bg-transparent px-2.5 py-1 text-[11px] font-semibold text-ink transition-all duration-200 hover:border-white/25 hover:bg-white/10 active:scale-[0.96] disabled:cursor-default disabled:opacity-40"
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
        className="mb-3.5 w-full rounded-[10px] border border-white/10 bg-black/25 px-3.5 py-2.5 text-sm text-ink outline-none transition-all duration-200 placeholder:text-[13px] placeholder:text-muted/50 focus:border-accent/45 focus:shadow-[0_0_0_3px_rgba(255,210,74,0.1)]"
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索歌曲名…"
        spellCheck={false}
      />

      {/* 专辑列表 - 卡片网格布局 */}
      <div className="flex max-h-[560px] flex-col gap-3.5 overflow-y-auto pr-1">
        {filteredAlbums.map((alb, ai) => {
          const pic = alb.pic || '';
          const albumName = alb.name || `未分类 ${ai + 1}`;
          const albumDesc = alb.desc || '';
          const albumDate = alb.date || '';
          const albumSelected = alb.songs.filter((s) => selectedIds.has(s.id)).length;
          const allSelected = albumSelected === alb.songs.length;
          const isCollapsed = collapsedAlbums.has(pic || `misc-${ai}`);
          const isDescExpanded = expandedDesc.has(pic || `misc-${ai}`);
          const hasDesc = albumDesc.length > 0;

          const albumHeaderFallback =
            alb.songs[0]?.picLocal || alb.songs[0]?.albumMid
              ? alb.songs[0]?.picLocal ||
                `https://y.gtimg.cn/music/photo_new/T002R300x300M000${alb.songs[0].albumMid}.jpg`
              : '';
          const handleHeaderImgError = (e) => {
            const img = e.currentTarget;
            if (albumHeaderFallback && img.src !== albumHeaderFallback) {
              img.src = albumHeaderFallback;
            } else {
              img.style.display = 'none';
              const placeholder = img.parentElement.querySelector('[data-placeholder]');
              if (placeholder) placeholder.style.display = '';
            }
          };

          return (
            <div
              key={pic || `album-${ai}`}
              className="shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/18"
            >
              {/* 专辑头部 */}
              <div
                className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-white/4"
                onClick={() => toggleCollapse(pic || `misc-${ai}`)}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                  {pic ? (
                    <>
                      <img
                        className="h-full w-full object-cover"
                        src={pic}
                        alt=""
                        loading="lazy"
                        onError={handleHeaderImgError}
                      />
                      <div
                        data-placeholder
                        className="hidden h-full w-full items-center justify-center bg-white/8 text-lg"
                      >
                        🎵
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/8 text-lg">
                      🎵
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-ink">{albumName}</span>
                  <span className="text-[11px] text-muted">
                    {albumDate ? `${albumDate} · ` : ''}
                    {albumSelected}/{alb.songs.length} 首
                  </span>
                </div>
                <button
                  className={clsx(
                    'shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-150',
                    allSelected
                      ? 'border-accent2/35 bg-accent2/10 text-accent2'
                      : 'border-white/10 bg-white/6 text-muted hover:border-white/20 hover:bg-white/10',
                  )}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAlbum(alb.songs);
                  }}
                >
                  {allSelected ? '取消' : '全选'}
                </button>
                <span
                  className={clsx(
                    'shrink-0 text-xs text-muted transition-transform duration-200',
                    isCollapsed && '-rotate-90',
                  )}
                >
                  ▾
                </span>
              </div>

              {/* 专辑简介 */}
              {!isCollapsed && hasDesc && (
                <div className="border-t border-white/4 px-3 pb-2">
                  <div
                    className={clsx(
                      'mt-2 cursor-pointer whitespace-pre-line text-xs leading-relaxed text-muted transition-[max-height] duration-300',
                      isDescExpanded
                        ? 'max-h-[500px]'
                        : 'relative max-h-[3.2em] overflow-hidden',
                    )}
                    onClick={() => toggleDesc(pic || `misc-${ai}`)}
                  >
                    {albumDesc}
                  </div>
                  <button
                    className="mt-1 cursor-pointer border-none bg-transparent p-0 text-[11px] font-semibold text-accent hover:underline"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDesc(pic || `misc-${ai}`);
                    }}
                  >
                    {isDescExpanded ? '收起' : '展开简介'}
                  </button>
                </div>
              )}

              {/* 歌曲卡片网格 */}
              {!isCollapsed && (
                <div className="grid grid-cols-3 gap-2.5 p-[10px_12px_14px]">
                  {alb.songs.map((song, k) => {
                    const isSelected = selectedIds.has(song.id);
                    const t062Url = song.songmid
                      ? `https://y.gtimg.cn/music/photo_new/T062R300x300M000${song.songmid}.jpg`
                      : '';
                    const t002Url = song.albumMid
                      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albumMid}.jpg`
                      : '';
                    const songArt = alb.isMisc
                      ? song.picLocal ||
                        song.songPic ||
                        song.pic ||
                        t062Url ||
                        t002Url ||
                        ''
                      : pic || song.picLocal || song.songPic || t062Url || t002Url || '';
                    const handleArtError = (e) => {
                      const img = e.currentTarget;
                      const tried = img.dataset.tried || '';
                      if (alb.isMisc) {
                        if (tried === '' && song.picLocal) {
                          img.dataset.tried = 'picLocal';
                          img.src = song.picLocal;
                          return;
                        }
                        if (tried !== 'pic' && song.pic) {
                          img.dataset.tried = 'pic';
                          img.src = song.pic;
                          return;
                        }
                        if (tried !== 'songPic' && song.songPic) {
                          img.dataset.tried = 'songPic';
                          img.src = song.songPic;
                          return;
                        }
                        if (tried !== 't062' && t062Url) {
                          img.dataset.tried = 't062';
                          img.src = t062Url;
                          return;
                        }
                        if (tried !== 't002' && t002Url) {
                          img.dataset.tried = 't002';
                          img.src = t002Url;
                          return;
                        }
                      } else {
                        if (tried !== 'picLocal' && song.picLocal) {
                          img.dataset.tried = 'picLocal';
                          img.src = song.picLocal;
                          return;
                        }
                        if (tried !== 'songPic' && song.songPic) {
                          img.dataset.tried = 'songPic';
                          img.src = song.songPic;
                          return;
                        }
                        if (tried !== 't062' && t062Url) {
                          img.dataset.tried = 't062';
                          img.src = t062Url;
                          return;
                        }
                        if (tried !== 't002' && t002Url) {
                          img.dataset.tried = 't002';
                          img.src = t002Url;
                          return;
                        }
                      }
                      img.style.display = 'none';
                    };
                    const isThisPlaying = playingId === song.id;
                    const showPause = isThisPlaying && isPlaying && !previewLoading;
                    const showSpinner = isThisPlaying && previewLoading;
                    return (
                      <div
                        key={song.id}
                        className={clsx(
                          'group relative min-w-0 cursor-pointer overflow-hidden rounded-md border-[1.5px] border-white/6 bg-white/[0.045] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] animate-[cardIn_0.4s_cubic-bezier(0.2,0.8,0.2,1)_both]',
                          'hover:-translate-y-[3px] hover:border-white/15',
                          'active:scale-[0.97]',
                          isSelected &&
                            'border-transparent shadow-[0_0_0_2px_var(--accent),0_12px_30px_-12px_rgba(255,210,74,0.4)]',
                          isThisPlaying &&
                            'shadow-[0_0_0_2px_var(--accent),0_0_16px_rgba(255,210,74,0.3)]',
                        )}
                        onClick={() => toggleSong(song.id)}
                        role="button"
                        tabIndex={0}
                        style={{ animationDelay: `${Math.min(k * 30, 500)}ms` }}
                      >
                        <div className="relative overflow-hidden bg-white/8 before:block before:pt-[100%]">
                          {songArt ? (
                            <img
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.08]"
                              src={songArt}
                              alt=""
                              loading="lazy"
                              onError={handleArtError}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[28px] text-muted/40">
                              🎵
                            </div>
                          )}
                          {/* 选中勾选 */}
                          <div
                            className={clsx(
                              'absolute right-2 top-2 grid h-[26px] w-[26px] place-items-center rounded-full bg-gradient-to-br from-accent to-accent2 text-sm font-black text-[#1a1a2e] shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all duration-250 ease-[cubic-bezier(0.2,1.4,0.2,1)]',
                              isSelected
                                ? 'scale-100 opacity-100'
                                : 'scale-[0.4] opacity-0',
                            )}
                          >
                            ✓
                          </div>
                          {/* 试听按钮 */}
                          {onPreview && (
                            <button
                              className={clsx(
                                'absolute bottom-[7px] right-[7px] z-[3] grid h-[30px] w-[30px] place-items-center rounded-full border-none bg-black/60 text-xs text-paper backdrop-blur-[4px] transition-all duration-200',
                                'opacity-0 scale-[0.8] group-hover:opacity-100 group-hover:scale-100',
                                isThisPlaying &&
                                  'opacity-100 scale-100 bg-gradient-to-br from-accent to-accent2 text-[#1a1a2e]',
                              )}
                              type="button"
                              aria-label={showPause ? '暂停' : '试听'}
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreview(song);
                              }}
                            >
                              {showSpinner ? (
                                <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              ) : showPause ? (
                                '⏸'
                              ) : (
                                '▶'
                              )}
                            </button>
                          )}
                        </div>
                        <div
                          className={clsx(
                            'px-2 pb-[9px] pt-[7px] text-[11.5px] font-medium leading-[1.3] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box] overflow-hidden break-words',
                            isSelected ? 'text-accent' : 'text-ink',
                          )}
                          style={{ minHeight: '2.9em' }}
                        >
                          {song.name}
                        </div>
                        {(song.itunesTrackUrl || song.songmid) && (
                          <a
                            className="block px-2 pb-[7px] text-[10px] text-accent no-underline opacity-70 transition-opacity duration-200 hover:opacity-100"
                            href={
                              song.itunesTrackUrl ||
                              `https://y.qq.com/n/ryqq/songDetail/${song.songmid}`
                            }
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
