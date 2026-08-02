import React from 'react';
import { clsx } from 'clsx';
import { SINGERS, SINGER_ICONS, classicOptions } from '../data/singers.js';
import { SINGER_REGISTRY } from '../data/singerRegistry.js';

/**
 * 跨歌手模式：多选歌手选择器（支持搜索额外歌手）
 *
 * @param {Set<string>} selectedSingers - 已选歌手 ID 集合（含 dyn_xxx 动态歌手）
 * @param {(id: string) => void} onToggleSinger - 切换歌手选中状态
 * @param {Object<string, object>} singerDataMap - 已加载的静态歌手数据映射
 * @param {boolean} loading - 是否正在加载歌手数据
 * @param {number} bracketSize - 当前选择的淘汰赛规模
 * @param {(size: number) => void} onSelectSize - 规模选择回调
 * @param {number[]} availableSizes - 可选规模列表
 * @param {'cross-battle'|'cross-wc'} mode - 跨歌手子模式
 * @param {string} crossSearchKeyword - 搜索关键词
 * @param {(v: string) => void} onCrossSearch - 搜索输入回调
 * @param {Array} crossSearchResults - 搜索结果
 * @param {boolean} isCrossSearching - 搜索中
 * @param {(singer: {name, mid, photo}) => void} onAddDynamicSinger - 添加动态歌手
 * @param {Map} dynamicSingers - 已加载的动态歌手映射
 * @param {Set} loadingMids - 正在加载的歌手 mid 集合
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
  crossBattleType,
  crossTotalItems,
}) {
  const selectedList = [...(selectedSingers || [])];
  const selectedCount = selectedList.length;
const maxSingers = 16; // 增加到16位，支持更多歌手混战
const minSingers = 2;

  // 计算可选规模：基于已加载歌手的总歌曲数
  const totalSongs = selectedList.reduce((sum, id) => {
    if (id.startsWith('dyn_')) {
      const mid = id.slice(4);
      const dyn = dynamicSingers?.get(mid);
      return sum + (dyn?.data?.entrants?.length || 0);
    }
    const sd = singerDataMap[id];
    return sum + (sd?.entrants?.length || 0);
  }, 0);

  // 跨歌手对战：根据歌手数和歌曲数计算可选规模
  const sizes =
    mode === 'cross-wc'
      ? []
      : availableSizes && availableSizes.length > 0
        ? availableSizes
        : classicOptions(Math.min(totalSongs, 128));

  const currentSize = mode === 'cross-wc' ? 48 : bracketSize || sizes[0] || 32;
  const perSinger = selectedCount > 0 ? Math.ceil(currentSize / selectedCount) : 0;

  // 动态歌手列表
  const dynamicList = dynamicSingers ? [...dynamicSingers.values()] : [];

  return (
  <div className="mx-auto mb-4 max-w-[560px] rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
      <span className="text-[13px] font-bold text-ink">⚔️ 选择参赛歌手</span>
      <span className="text-[12px] text-muted">
        已选 <b className="text-accent">{selectedCount}</b> / {maxSingers} 位
        {selectedCount < minSingers && (
          <span className="ml-1 text-[10px] text-accent2">
            (至少 {minSingers} 位)
          </span>
        )}
      </span>
    </div>

      {/* 内置歌手多选按钮 */}
      <div className="mb-3 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
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
              className={clsx(
                'relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all duration-200',
                isSelected
                  ? 'border-accent/50 bg-accent/10'
                  : 'border-white/10 bg-white/4 hover:border-white/25 hover:bg-white/8',
                !isSelected &&
                  selectedCount >= maxSingers &&
                  'cursor-not-allowed opacity-40',
              )}
              onClick={() => onToggleSinger(id)}
              type="button"
              disabled={!isSelected && selectedCount >= maxSingers}
            >
              {photo ? (
                <img
                  className="h-9 w-9 rounded-full border-2 border-white/15 object-cover"
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
              <span className="text-xs font-bold text-ink">{s.name}</span>
              {isSelected && (
                <span className="text-[10px] text-muted">
                  {isLoadingThis ? (
                    <i className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/18 border-t-accent" />
                  ) : songCount > 0 ? (
                    `${songCount} 首`
                  ) : (
                    ''
                  )}
                </span>
              )}
              {isSelected && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-black text-bg">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 已添加的动态歌手 */}
      {dynamicList.length > 0 && (
        <div className="mb-3 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
          {dynamicList.map((dyn) => {
            const dynId = `dyn_${dyn.mid}`;
            const isSelected = selectedSingers?.has(dynId);
            const songCount = dyn.data?.entrants?.length || 0;

            return (
              <button
                key={dyn.mid}
                className={clsx(
                  'relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all duration-200',
                  isSelected
                    ? 'border-accent/50 bg-accent/10'
                    : 'border-white/10 bg-white/4 hover:border-white/25 hover:bg-white/8',
                  !isSelected &&
                    selectedCount >= maxSingers &&
                    'cursor-not-allowed opacity-40',
                )}
                onClick={() => onToggleSinger(dynId)}
                type="button"
                disabled={!isSelected && selectedCount >= maxSingers}
              >
                {dyn.photo ? (
                  <img
                    className="h-9 w-9 rounded-full border-2 border-white/15 object-cover"
                    src={dyn.photo}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const next = e.currentTarget.nextElementSibling;
                      if (next) next.style.display = '';
                    }}
                  />
                ) : null}
                <span className="text-lg" style={{ display: dyn.photo ? 'none' : '' }}>
                  🎤
                </span>
                <span className="text-xs font-bold text-ink">{dyn.name}</span>
                {isSelected && songCount > 0 && (
                  <span className="text-[10px] text-muted">{songCount} 首</span>
                )}
                {isSelected && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-black text-bg">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 搜索额外歌手 */}
      <div className="relative mb-3">
        <input
          type="text"
          className="w-full rounded-full border border-white/[0.08] bg-white/[0.04] px-[18px] py-[11px] text-sm text-ink outline-none transition-all duration-200 placeholder:text-[13px] placeholder:text-white/40 focus:border-accent focus:ring-2 focus:ring-accent/40"
          placeholder="搜索更多歌手加入混战…"
          value={crossSearchKeyword || ''}
          onChange={(e) => onCrossSearch?.(e.target.value)}
          spellCheck={false}
        />
        {isCrossSearching && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm">🔍</span>
        )}
      </div>

      {/* 搜索结果 */}
      {crossSearchResults && crossSearchResults.length > 0 && (
        <div className="mb-3 grid max-h-[200px] grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 overflow-y-auto">
          {crossSearchResults.slice(0, 8).map((singer) => {
            const dynId = `dyn_${singer.mid}`;
            const isAdded = dynamicSingers?.has(singer.mid);
            const isSelected = selectedSingers?.has(dynId);
            const isLoading = loadingMids?.has(singer.mid);

            return (
              <button
                key={singer.mid}
                className={clsx(
                  'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition-all duration-200',
                  isSelected
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : isAdded
                      ? 'border-good/40 bg-good/[0.08] text-white'
                        : 'border-white/[0.08] bg-white/[0.03] text-muted hover:border-accent/40 hover:bg-accent/[0.08] hover:text-ink',
                  (isLoading ||
                    (!isAdded && !isSelected && selectedCount >= maxSingers)) &&
                    'cursor-not-allowed opacity-50',
                )}
                onClick={() => {
                  if (isAdded) {
                    onToggleSinger(dynId);
                  } else if (!isLoading && selectedCount < maxSingers) {
                    onAddDynamicSinger(singer);
                  }
                }}
                type="button"
                disabled={
                  isLoading || (!isAdded && !isSelected && selectedCount >= maxSingers)
                }
              >
                <img
                  className="h-7 w-7 shrink-0 rounded-full border border-white/15 object-cover"
                  src={singer.photo}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="min-w-0 truncate">{singer.name}</span>
                {isLoading && (
                  <i className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white/18 border-t-accent" />
                )}
                {isAdded && !isSelected && (
                  <span className="ml-auto shrink-0 text-[10px] text-muted">
                    点击选择
                  </span>
                )}
                {isSelected && (
                  <span className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-black text-bg">
                    ✓
                  </span>
                )}
                {!isAdded && !isLoading && (
                  <span className="ml-auto shrink-0 text-[10px] text-accent">+ 添加</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 规模选择（仅混战淘汰赛模式） */}
      {mode === 'cross-battle' && sizes.length > 0 && selectedCount >= minSingers && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
          <span className="whitespace-nowrap text-[13px] text-muted">
            淘汰赛规模
            {perSinger > 0 && (
              <small className="ml-1 text-[11px]">
                （每位歌手约 {perSinger}
                {crossBattleType === 'albums'
                  ? ' 张专辑'
                  : crossBattleType === 'singers'
                    ? ' 位'
                    : ' 首'}
                ）
              </small>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                className={clsx(
                  'cursor-pointer rounded-[20px] border px-4 py-1.5 text-[13px] font-semibold transition-all duration-200 active:scale-[0.94]',
                  currentSize === size
                    ? 'border-accent/50 bg-accent/[0.15] text-ink'
                    : 'border-white/[0.08] bg-white/[0.03] text-muted hover:border-accent/30 hover:bg-accent/[0.06] hover:text-ink',
                )}
                onClick={() => onSelectSize(size)}
                type="button"
              >
                {size}强
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 世界杯模式说明 */}
      {mode === 'cross-wc' && selectedCount >= minSingers && (
        <div className="mb-3 text-center">
          <span className="text-[13px] text-muted">
            赛制：12 组四选二 + 32 强淘汰赛（约 48 首参赛）
          </span>
        </div>
      )}

      {/* 加载中提示 */}
      {loading && selectedCount >= minSingers && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-muted">
          <i className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/18 border-t-accent" />
          正在加载歌手数据…
        </div>
      )}
    </div>
  );
}
