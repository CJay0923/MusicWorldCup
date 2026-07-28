import { clsx } from 'clsx';

/**
 * 紧凑歌词显示：当前行（高亮）+ 下一行（淡色）
 * 无歌词时不渲染。
 * @param {Array<{time:number, text:string}>} lyrics - 解析后的歌词行
 * @param {number} lyricIndex - 当前行索引，-1 表示无
 * @param {string} variant - 'card' | 'gp' 适配不同容器
 */
export default function LyricsView({ lyrics, lyricIndex, variant = 'card' }) {
  if (!lyrics || lyrics.length === 0) return null;

  const current = lyricIndex >= 0 ? lyrics[lyricIndex] : null;
  const next =
    lyricIndex >= 0 && lyricIndex + 1 < lyrics.length
      ? lyrics[lyricIndex + 1]
      : null;

  return (
    <div className={clsx('mp-lyrics', variant)}>
      {current && <div className="mp-lyric-current">{current.text}</div>}
      {next && <div className="mp-lyric-next">{next.text}</div>}
    </div>
  );
}
