import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import FEATURED_COVERS from '../data/featuredCovers.json';
import { SINGER_REGISTRY } from '../data/singerRegistry.js';
import { jsDelivrSingerUrl, qqSingerPhotoUrl } from '../lib/assets';

/**
 * 歌手封面墙选择器：歌手头像网格 + 选中强调环。
 * 网格末尾固定渲染 1 个「搜索更多歌手」按钮，
 * 点击弹出搜索模态层，支持搜索并添加任意歌手。
 *
 * @param {object} singers - SINGERS 对象（id -> {name, nameEn, ...}）
 * @param {string} current - 当前选中的内置歌手 id（动态歌手激活时为 null）
 * @param {(id: string) => void} onSelect - 选中内置歌手回调
 * @param {string} [searchKeyword] - 搜索关键词（受控）
 * @param {(v: string) => void} [onSearch] - 搜索输入回调
 * @param {Array<{name, mid, photo}>} [searchResults] - 搜索结果
 * @param {boolean} [isSearching] - 搜索中
 * @param {{name, mid, photo}|null} [dynamicSinger] - 已加载的动态歌手
 * @param {boolean} [isLoadingSinger] - 动态歌手歌曲加载中
 * @param {string} [loadingProgress] - 加载进度文本
 * @param {(singer) => void} [onLoadSinger] - 加载某动态歌手
 * @param {() => void} [onClearDynamicSinger] - 清除动态歌手
 * @param {boolean} [singerLoading] - 内置歌手数据加载中
 */
export default function CoverWallSelector({
  singers,
  current,
  onSelect,
  searchKeyword = '',
  onSearch,
  searchResults = [],
  isSearching = false,
  dynamicSinger = null,
  isLoadingSinger = false,
  loadingProgress = '',
  onLoadSinger,
  onClearDynamicSinger,
  singerLoading = false,
}) {
  const hasSearch = typeof onSearch === 'function';
  const ids = Object.keys(singers);

  // ---------- 搜索模态层状态 ----------
  const [modalOpen, setModalOpen] = useState(false);
  const searchInputRef = useRef(null);
  // 打开模态层时聚焦输入框
  useEffect(() => {
    if (modalOpen && searchInputRef.current) {
      // 等待渲染完成后聚焦
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [modalOpen]);

  const closeModal = () => {
    setModalOpen(false);
    // 关闭时清空搜索关键词与结果，避免下次打开残留
    if (hasSearch && searchKeyword.trim()) onSearch('');
  };

  // 选择搜索结果 → 加载该歌手并关闭模态层
  const handleModalPick = (r) => {
    if (onLoadSinger) onLoadSinger(r);
    closeModal();
  };

  // ---------- 渲染：选中动态歌手 / 加载中 / 内联搜索框 ----------
  const inlineBlock = hasSearch
    ? dynamicSinger
      ? (
          <div className="mx-auto mt-4 flex max-w-[480px] items-center gap-3 rounded-xl border border-accent/40 bg-accent/[0.1] px-3.5 py-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.2)] animate-[pop_0.3s_cubic-bezier(0.22,1.3,0.36,1)]">
            <img
              className="h-10 w-10 shrink-0 rounded-full border-2 border-accent object-cover"
              src={dynamicSinger.photo}
              alt=""
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget;
                const tried = img.dataset.tried || '';
                if (tried === 'qq') { img.style.display = 'none'; return; }
                if (!tried && dynamicSinger.mid) {
                  img.dataset.tried = 'jsdelivr';
                  img.src = jsDelivrSingerUrl(dynamicSinger.mid);
                } else if (tried === 'jsdelivr' && dynamicSinger.mid) {
                  img.dataset.tried = 'qq';
                  img.src = qqSingerPhotoUrl(dynamicSinger.mid);
                } else {
                  img.style.display = 'none';
                }
              }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-extrabold text-white">
                {dynamicSinger.name}
              </span>
              {isLoadingSinger ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <i className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white/18 border-t-accent" />
                  {loadingProgress || '加载中…'}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-accent">
                  已加载 · 点击 × 切换
                </span>
              )}
            </div>
            {!isLoadingSinger && (
              <button
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-base leading-none text-muted transition-all duration-200 hover:border-accent2/40 hover:bg-accent2/18 hover:text-accent2"
                type="button"
                aria-label="清除动态歌手"
                onClick={onClearDynamicSinger}
              >
                ×
              </button>
            )}
          </div>
        )
      : singerLoading
        ? (
            <div className="mx-auto mt-4 flex max-w-[480px] items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-extrabold text-white">加载歌曲数据中…</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <i className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white/18 border-t-accent" />
                  正在获取歌曲列表
                </span>
              </div>
            </div>
          )
        : (
            <div className="relative mx-auto mt-4 max-w-[480px]">
              <input
                className="w-full rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm text-ink outline-none transition-all duration-200 placeholder:text-[13px] placeholder:text-white/40 focus:border-accent focus:ring-2 focus:ring-accent/40"
                type="text"
                value={searchKeyword}
                placeholder="搜索任意歌手（如：王菲、五月天、邓紫棋）"
                onChange={(e) => onSearch(e.target.value)}
              />
              {isSearching && (
                <span className="pointer-events-none absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 text-xs text-muted">
                  <i className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white/18 border-t-accent" />
                  搜索中…
                </span>
              )}
              {!isSearching && searchResults.length > 0 && (
                <div className="mt-2.5 grid max-h-70 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 overflow-y-auto rounded-xl border border-white/[0.08] bg-bg2 p-1">
                  {searchResults.map((r) => (
                    <button
                      key={r.mid}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-[13px] font-semibold text-ink transition-all duration-200 animate-[cardIn_0.3s_cubic-bezier(0.2,0.8,0.2,1)_both] hover:-translate-y-0.5 hover:border-accent/45 hover:bg-white/[0.06] active:scale-[0.97]"
                      type="button"
                      onClick={() => onLoadSinger && onLoadSinger(r)}
                    >
                      {r.photo ? (
                        <img
                          className="h-8 w-8 shrink-0 rounded-full border-[1.5px] border-white/15 object-cover"
                          src={r.photo}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const next = e.currentTarget.nextElementSibling;
                            if (next) next.style.display = '';
                          }}
                        />
                      ) : null}
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-base"
                        style={{ display: r.photo ? 'none' : '' }}
                      >
                        🎤
                      </span>
                      <span className="min-w-0 truncate">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {!isSearching && searchKeyword.trim() && searchResults.length === 0 && (
                <div className="mt-2 text-center text-xs text-muted">未找到匹配的歌手</div>
              )}
            </div>
          )
    : null;

  return (
    <div className="mb-5">
      {/* 内置歌手封面墙 + 末尾「搜索更多歌手」按钮 */}
      <div
        className="mx-auto grid w-full max-w-[1100px] grid-cols-2 gap-3 px-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6"
        role="listbox"
        aria-label="选择歌手"
      >
        {ids.map((id) => {
          const s = singers[id];
          const info = FEATURED_COVERS[id] || {};
          const surname = info.surname || (s.name || '?').charAt(0);
          const registryInfo = SINGER_REGISTRY[id] || {};
          const photo = registryInfo.photo || '';
          const selected = id === current;
          return (
            <SingerCard
              key={id}
              name={s.name}
              surname={surname}
              photo={photo}
              selected={selected}
              onClick={() => onSelect(id)}
            />
          );
        })}

        {/* 搜索更多歌手按钮（弹出搜索框，可搜任意歌手添加） */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={clsx(
            'group relative aspect-square min-w-0 cursor-pointer overflow-hidden rounded-2xl border-2 text-left sm:min-w-[160px] lg:min-w-[220px]',
            'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(167,139,250,0.28)] active:scale-[0.97]',
            'border-dashed border-white/[0.14] hover:border-accent/40',
          )}
        >
          <span className="absolute inset-0 z-0 bg-gradient-to-br from-bg3 to-bg" />
          <span className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <span className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-3 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.06] text-xl font-bold text-white/70 transition-all duration-300 group-hover:scale-110 group-hover:border-accent/50 group-hover:text-accent">
              🔍
            </span>
            <span className="text-[13px] font-bold tracking-wide text-white/70 transition-colors duration-300 group-hover:text-white">
              搜索更多歌手
            </span>
          </span>
        </button>
      </div>

      {/* 动态歌手搜索 / 已选动态歌手 */}
      {inlineBlock}

      {/* 搜索模态层 */}
      {modalOpen && hasSearch && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-[rgba(0,0,0,0.96)] p-6 backdrop-blur-[6px] animate-[fade_0.25s_ease]"
          onClick={closeModal}
        >
          <div
            className="relative flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-bg2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-[pop_0.3s_cubic-bezier(0.22,1.3,0.36,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 模态标题 + 关闭按钮 */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <h3 className="text-base font-extrabold tracking-wide text-ink">
                添加歌手
              </h3>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-base leading-none text-muted transition-all duration-200 hover:bg-white/[0.12] hover:text-ink"
                type="button"
                onClick={closeModal}
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            {/* 搜索输入框 */}
            <div className="px-5 pt-4">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  className="w-full rounded-full border border-white/[0.1] bg-white/[0.04] px-5 py-3 text-sm text-ink outline-none transition-all duration-200 placeholder:text-[13px] placeholder:text-white/40 focus:border-accent focus:ring-2 focus:ring-accent/40"
                  type="text"
                  value={searchKeyword}
                  placeholder="输入歌手名搜索，如：王菲、五月天"
                  onChange={(e) => onSearch(e.target.value)}
                />
                {isSearching && (
                  <span className="pointer-events-none absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 text-xs text-muted">
                    <i className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white/18 border-t-accent" />
                    搜索中…
                  </span>
                )}
              </div>
            </div>

            {/* 搜索结果列表 */}
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-5">
              {!searchKeyword.trim() ? (
                <p className="py-10 text-center text-[13px] text-muted">
                  输入关键词搜索歌手，找到后点击即可添加到列表
                </p>
              ) : isSearching ? (
                <p className="py-10 text-center text-[13px] text-muted">正在搜索…</p>
              ) : searchResults.length > 0 ? (
                <ul className="space-y-2">
                  {searchResults.map((r) => {
                    const alreadyAdded =
                      dynamicSinger?.mid === r.mid ||
                      ids.some((id) => {
                        const reg = SINGER_REGISTRY[id];
                        return reg?.singermid === r.mid;
                      });
                    return (
                      <li key={r.mid}>
                        <button
                          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-left transition-all duration-200 animate-[cardIn_0.3s_cubic-bezier(0.2,0.8,0.2,1)_both] hover:-translate-y-0.5 hover:border-accent/45 hover:bg-white/[0.06] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleModalPick(r)}
                        >
                          {r.photo ? (
                            <img
                              className="h-10 w-10 shrink-0 rounded-full border-[1.5px] border-white/15 object-cover"
                              src={r.photo}
                              alt=""
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const next = e.currentTarget.nextElementSibling;
                                if (next) next.style.display = '';
                              }}
                            />
                          ) : null}
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-lg"
                            style={{ display: r.photo ? 'none' : '' }}
                          >
                            🎤
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14px] font-semibold text-ink">
                              {r.name}
                            </div>
                            <div className="text-[11px] text-muted">
                              {alreadyAdded ? '已在列表中' : '点击添加'}
                            </div>
                          </div>
                          <span
                            className={clsx(
                              'shrink-0 text-lg transition-transform duration-200',
                              alreadyAdded ? 'text-muted/50' : 'text-accent group-hover:translate-x-0.5',
                            )}
                          >
                            {alreadyAdded ? '✓' : '＋'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-10 text-center text-[13px] text-muted">未找到匹配的歌手</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SingerCard({ name, surname, photo, selected, onClick }) {
  const [imgError, setImgError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  const handleError = (e) => {
    if (!triedFallback && photo) {
      const match = photo.match(/singer_(.+?)\.jpg$/);
      if (match && match[1]) {
        setTriedFallback(true);
        e.currentTarget.src = jsDelivrSingerUrl(match[1]);
        return;
      }
    }
    setImgError(true);
  };

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      title={name}
      onClick={onClick}
      className={clsx(
        'group relative aspect-square min-w-0 cursor-pointer overflow-hidden rounded-2xl border-2 text-left sm:min-w-[160px] lg:min-w-[220px]',
        'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(167,139,250,0.28)] active:scale-[0.97]',
        selected
          ? 'border-accent ring-2 ring-accent/60'
          : 'border-white/[0.08] hover:border-accent/40',
      )}
    >
      <span className="absolute inset-0 z-0 bg-gradient-to-br from-bg3 to-bg" />
      {!imgError && photo ? (
        <img
          src={photo}
          alt=""
          className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          onError={handleError}
        />
      ) : null}
      <span className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      {imgError ? (
        <span
          className={clsx(
            'absolute inset-0 flex items-center justify-center font-display text-[clamp(40px,8vw,64px)] font-black leading-none',
            'text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]',
          )}
          aria-hidden="true"
        >
          {surname}
        </span>
      ) : null}
      <span className="absolute inset-x-0 bottom-0 z-20 flex items-end px-3 pb-2.5 pt-10">
        <span
          className="truncate text-[15px] font-extrabold leading-tight tracking-wide text-white"
          style={{
            textShadow:
              '0 1px 2px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.7), 0 0 12px rgba(0,0,0,0.5)',
          }}
        >
          {name}
        </span>
      </span>
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent shadow">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6.5L4.5 9L10 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}
