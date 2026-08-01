import React from 'react';
import { clsx } from 'clsx';
import { SINGER_ICONS } from '../data/singers.js';
import { SINGER_REGISTRY } from '../data/singerRegistry.js';

/**
 * Singer selection: built-in singer buttons + dynamic search box.
 *
 * @param {object} singers - SINGERS object mapping id -> singer data
 * @param {string} current - currently selected built-in singer id (null when a dynamic singer is active)
 * @param {(id: string) => void} onSelect - callback when a built-in singer is selected
 * @param {string} [searchKeyword] - current search keyword (controlled input)
 * @param {(v: string) => void} [onSearch] - called when the search input changes
 * @param {Array<{name, mid, photo}>} [searchResults] - singer search results
 * @param {boolean} [isSearching] - whether a search is in flight
 * @param {{name, mid, photo}|null} [dynamicSinger] - currently loaded dynamic singer
 * @param {boolean} [isLoadingSinger] - whether the dynamic singer songs are loading
 * @param {string} [loadingProgress] - loading progress text (e.g. "已加载 120/493 首")
 * @param {(singer: {name, mid, photo}) => void} [onLoadSinger] - load a singer from search results
 * @param {() => void} [onClearDynamicSinger] - clear the loaded dynamic singer
 * @param {boolean} [singerLoading] - 内置歌手数据加载中（切换歌手时显示）
 */
export default function SingerSelector({
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

  return (
    <div className="mb-5">
      {/* 内置歌手按钮 */}
      <div className="flex flex-wrap justify-center gap-3">
        {Object.keys(singers).map((id) => {
          const s = singers[id];
          const icon = SINGER_ICONS[id] || '🎤';
          const photo = s?.singerPhoto || SINGER_REGISTRY[id]?.photo;
          return (
            <button
              key={id}
              className={clsx(
                'inline-flex cursor-pointer items-center gap-[9px] rounded-full border px-6 py-[11px]',
                'text-sm font-bold backdrop-blur-[4px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
                'hover:-translate-y-0.5 hover:bg-white/10 hover:border-white/25 hover:text-ink hover:shadow-[0_8px_20px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]',
                'active:scale-[0.96]',
                id === current
                  ? 'border-accent/60 bg-accent/[0.12] text-white shadow-[0_0_20px_rgba(230,57,70,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]'
                  : 'border-white/[0.08] bg-white/[0.03] text-white/50',
              )}
              onClick={() => onSelect(id)}
              type="button"
            >
              {photo ? (
                <img
                  className={clsx(
                    'h-[30px] w-[30px] shrink-0 rounded-full border-2 object-cover transition-all duration-300',
                    id === current
                      ? 'border-accent shadow-[0_0_12px_rgba(255,210,74,0.5)]'
                      : 'border-white/15',
                  )}
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
              <span className="text-lg" style={{ display: photo ? 'none' : '' }}>
                {icon}
              </span>
              {s.name}
            </button>
          );
        })}
      </div>

      {/* 动态歌手搜索 / 已选动态歌手 */}
      {hasSearch &&
        (dynamicSinger ? (
            <div className="mx-auto mt-3.5 flex max-w-[480px] items-center gap-3 rounded-xl border border-accent/40 bg-accent/[0.1] px-3.5 py-2.5 shadow-[0_8px_24px_rgba(230,57,70,0.15)] animate-[pop_0.3s_cubic-bezier(0.22,1.3,0.36,1)]">
            <img
              className="h-10 w-10 shrink-0 rounded-full border-2 border-accent object-cover"
              src={dynamicSinger.photo}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-extrabold text-white">
                {dynamicSinger.name}
              </span>
              {isLoadingSinger ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <i className="inline-block h-[13px] w-[13px] shrink-0 animate-spin rounded-full border-2 border-white/18 border-t-accent" />
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
        ) : singerLoading ? (
          <div className="mx-auto mt-3.5 flex max-w-[480px] items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-extrabold text-white">加载歌曲数据中…</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                <i className="inline-block h-[13px] w-[13px] shrink-0 animate-spin rounded-full border-2 border-white/18 border-t-accent" />
                正在获取歌曲列表
              </span>
            </div>
          </div>
        ) : (
          <div className="relative mx-auto mt-3.5 max-w-[480px]">
            <input
              className="w-full rounded-full border border-white/[0.08] bg-white/[0.04] px-[18px] py-[11px] text-sm text-white outline-none transition-all duration-200 placeholder:text-[13px] placeholder:text-white/25 focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(230,57,70,0.15)]"
              type="text"
              value={searchKeyword}
              placeholder="搜索任意歌手（如：王菲、五月天、邓紫棋）"
              onChange={(e) => onSearch(e.target.value)}
            />
            {isSearching && (
              <span className="pointer-events-none absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 text-xs text-muted">
                <i className="inline-block h-[13px] w-[13px] shrink-0 animate-spin rounded-full border-2 border-white/18 border-t-accent" />
                搜索中…
              </span>
            )}
            {!isSearching && searchResults.length > 0 && (
              <div className="mt-2.5 grid max-h-[280px] grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 overflow-y-auto p-0.5">
                {searchResults.map((r) => (
                  <button
                    key={r.mid}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-[13px] font-semibold text-white transition-all duration-200 animate-[cardIn_0.3s_cubic-bezier(0.2,0.8,0.2,1)_both] hover:-translate-y-0.5 hover:border-accent/45 hover:bg-white/[0.06] active:scale-[0.97]"
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
        ))}
    </div>
  );
}
