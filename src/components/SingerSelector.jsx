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
    <div className="singer-select-wrap">
      {/* 内置歌手按钮 */}
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

      {/* 动态歌手搜索 / 已选动态歌手 */}
      {hasSearch &&
        (dynamicSinger ? (
          <div className="dynamic-singer-badge">
            <img
              className="dsb-avatar"
              src={dynamicSinger.photo}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="dsb-info">
              <span className="dsb-name">{dynamicSinger.name}</span>
              {isLoadingSinger ? (
                <span className="dsb-progress">
                  <i className="dsb-spin" />
                  {loadingProgress || '加载中…'}
                </span>
              ) : (
                <span className="dsb-tag">已加载 · 点击 × 切换</span>
              )}
            </div>
            {!isLoadingSinger && (
              <button
                className="dsb-clear"
                type="button"
                aria-label="清除动态歌手"
                onClick={onClearDynamicSinger}
              >
                ×
              </button>
            )}
          </div>
        ) : singerLoading ? (
          <div className="dynamic-singer-badge">
            <div className="dsb-info">
              <span className="dsb-name">加载歌曲数据中…</span>
              <span className="dsb-progress">
                <i className="dsb-spin" />
                正在获取歌曲列表
              </span>
            </div>
          </div>
        ) : (
          <div className="singer-search">
            <input
              className="singer-search-input"
              type="text"
              value={searchKeyword}
              placeholder="搜索任意歌手（如：王菲、五月天、邓紫棋）"
              onChange={(e) => onSearch(e.target.value)}
            />
            {isSearching && (
              <span className="singer-search-loading">
                <i className="dsb-spin" />
                搜索中…
              </span>
            )}
            {!isSearching && searchResults.length > 0 && (
              <div className="singer-search-results">
                {searchResults.map((r) => (
                  <button
                    key={r.mid}
                    className="singer-search-item"
                    type="button"
                    onClick={() => onLoadSinger && onLoadSinger(r)}
                  >
                    {r.photo ? (
                      <img
                        className="ssi-avatar"
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
                      className="ssi-ico"
                      style={{ display: r.photo ? 'none' : '' }}
                    >
                      🎤
                    </span>
                    <span className="ssi-name">{r.name}</span>
                  </button>
                ))}
              </div>
            )}
            {!isSearching &&
              searchKeyword.trim() &&
              searchResults.length === 0 && (
                <div className="singer-search-empty">未找到匹配的歌手</div>
              )}
          </div>
        ))}
    </div>
  );
}
