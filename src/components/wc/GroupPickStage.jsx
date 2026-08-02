// 四选二小组赛舞台：4 张 GOAT 风格大图卡片，封面铺满
import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

/**
 * @param {object} group - 当前小组 { name, members[4], picks[], done }
 * @param {object[]} entrants - 全部参赛者数组（按 id 索引）
 * @param {(memberIdx: number) => void} onToggle - 切换某首歌的选中状态
 * @param {() => void} onConfirm - 确认晋级（已选满 2 首时自动调用）
 * @param {(entrant: object) => void} onPreview - 试听某首歌
 */
export default function GroupPickStage({
  group,
  entrants,
  onToggle,
  onConfirm,
  onPreview,
}) {
  const confirmTimerRef = useRef(null);

  // 选满 2 首后自动晋级（延迟 800ms 让用户看到选中反馈）
  useEffect(() => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    if (group && group.picks.length === 2 && !group.done) {
      confirmTimerRef.current = setTimeout(() => {
        onConfirm();
      }, 800);
    }
    return () => {
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
    };
  }, [group?.picks, group?.done, onConfirm]);

  if (!group) return null;

  const pickedCount = group.picks.length;
  const isReady = pickedCount === 2;

  // 图片优先级：picLocal > albumMid CDN > songmid CDN > pic > songPic
  const getCoverSrc = (e) => {
    if (e.picLocal) return e.picLocal;
    if (e.albumMid) return `https://y.gtimg.cn/music/photo_new/T002R400x400M000${e.albumMid}.jpg`;
    if (e.songmid) return `https://y.gtimg.cn/music/photo_new/T062R400x400M000${e.songmid}.jpg`;
    if (e.pic) return e.pic;
    if (e.songPic) return e.songPic;
    return '';
  };

  // 图片加载错误处理
  const handleImgError = (ev, e) => {
    const img = ev.currentTarget;
    const tried = img.dataset.tried;
    if (tried) { img.style.display = 'none'; return; }
    img.dataset.tried = '1';
    if (e.songmid && !img.src.includes('T062')) img.src = `https://y.gtimg.cn/music/photo_new/T062R400x400M000${e.songmid}.jpg`;
    else if (e.albumMid && !img.src.includes('T002')) img.src = `https://y.gtimg.cn/music/photo_new/T002R400x400M000${e.albumMid}.jpg`;
    else if (e.pic && img.src !== e.pic) img.src = e.pic;
    else img.style.display = 'none';
  };

  // 底部渐变遮罩
  const overlayGradient = 'linear-gradient(to top, rgba(10,11,16,0.95) 0%, rgba(10,11,16,0.7) 35%, rgba(10,11,16,0.2) 65%, transparent 100%)';

  return (
    <div className="wc-group-stage">
      <div className="wc-group-header">
        <h3 className="m-0 font-display">
          <span className="group-name">{group.name}</span>组 · 四选二
        </h3>
        <p className="m-0 wc-sub">
          从 4 首中选 2 首直接晋级，无需两两对决
        </p>
      </div>

      <div className="wc-cards-grid">
        {group.members.map((idx, mi) => {
          const e = entrants[idx];
          if (!e) return null;
          const selected = group.picks.includes(mi);
          const order = selected ? group.picks.indexOf(mi) + 1 : 0;
          const coverSrc = getCoverSrc(e);

          return (
            <div
              key={mi}
              className={clsx(
                'goat-card',
                selected && 'goat-card--selected',
                !selected && pickedCount >= 2 && 'goat-card--disabled',
              )}
              onClick={() => onToggle(mi)}
            >
              {/* 全屏封面背景 */}
              <div className="goat-card-bg">
                {coverSrc ? (
                  <img
                    className="goat-card-img"
                    src={coverSrc}
                    alt={e.name}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={400}
                    onError={(ev) => handleImgError(ev, e)}
                  />
                ) : (
                  <div className="goat-card-empty">
                    <span>♪</span>
                  </div>
                )}
              </div>

              {/* 底部渐变遮罩 */}
              <div className="goat-card-overlay" style={{ background: overlayGradient }} />

              {/* 种子/排名标签 */}
              <span className={clsx(
                'goat-card-seed',
                e.isSeed ? 'goat-card-seed--seed' : '',
              )}>
                {e.isSeed ? `种子#${e.seedRank}` : `#${e.seed}`}
              </span>

              {/* 底部内容区 */}
              <div className="goat-card-body">
                <div className="goat-card-name">{e.name}</div>
                <div className={clsx('goat-card-status', selected && 'goat-card-status--selected')}>
                  {selected ? `✓ 第 ${order} 个晋级` : '点击选择'}
                </div>
                {onPreview && (
                  <button
                    className="goat-preview-btn"
                    type="button"
                    aria-label="试听"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onPreview(e);
                    }}
                  >
                    ▶ 试听
                  </button>
                )}
              </div>

              {/* 胜出勾选覆盖层 */}
              <div className={clsx('goat-check-overlay', selected && 'goat-check-overlay--show')}>
                <div className="goat-check-circle">✓</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="wc-footer">
        <span className="wc-footer-text">
          {isReady ? (
            <span className="wc-footer-ready">✓ 已选满 2 首，即将晋级…</span>
          ) : (
            <>
              已选 <b className="wc-footer-count">{pickedCount}</b> / 2
            </>
          )}
        </span>
      </div>
    </div>
  );
}
