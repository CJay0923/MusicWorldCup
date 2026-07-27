// useAudioPlayer.js
// 音乐播放器状态管理 Hook
//
// 负责:
//   - openAudition(ent, artistName): 打开试听
//       若 ent.nid 存在 -> 先尝试 BYFUNS_API 获取完整 URL，失败则用 METING_API
//       loadedmetadata 时若有 chorus 且 duration>35s 则 seek 到 chorus 位置
//       canplay 时自动播放
//       若 ent.nid 不存在 -> 打开 QQ 音乐搜索
//   - 播放/暂停、进度条 seek、"从头播放"、关闭播放器
//
// 注意: 组件需在 DOM 中常驻一个 <audio ref={audioRef} preload="metadata" /> 元素
//       (即使播放器 overlay 隐藏也保留)，以保证事件监听能正确绑定。

import { useCallback, useEffect, useRef, useState } from 'react';
import { BYFUNS_API, METING_API } from '../data/singers.js';
import { findITunesPreview } from '../utils/itunes.js';

const QQ_SEARCH = 'https://y.qq.com/n/ryqq/search?w=';

export function useAudioPlayer() {
  const audioRef = useRef(null);

  const [visible, setVisible] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [artist, setArtist] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [chorusTime, setChorusTime] = useState(null);

  // 用 ref 保存监听器需要读取的最新值（监听器只绑定一次）
  const currentSongRef = useRef(null);
  const nidRef = useRef(null);
  const triedMetingRef = useRef(false);
  const triedITunesRef = useRef(false);
  const artistRef = useRef('');

  // 绑定 audio 事件监听（仅一次）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      const song = currentSongRef.current;
      const cs = song?.chorus;
      if (cs && audio.duration > 35) {
        try {
          audio.currentTime = cs;
        } catch {
          /* ignore seek errors */
        }
        setChorusTime(cs);
      } else {
        setChorusTime(null);
      }
    };
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onCanPlay = () => {
      setIsLoading(false);
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      const nid = nidRef.current;
      // byfuns URL 加载失败 -> 切换到 METING_API 直链重试一次
      if (nid && !triedMetingRef.current) {
        triedMetingRef.current = true;
        setIsLoading(true);
        try {
          audio.src = METING_API + nid;
          audio.load();
        } catch {
          /* ignore */
        }
      } else if (!triedITunesRef.current) {
        // 网易云两条路都走不通 -> 尝试 iTunes 预览兜底
        triedITunesRef.current = true;
        setIsLoading(true);
        const song = currentSongRef.current;
        const artist = artistRef.current;
        if (song && song.name) {
          findITunesPreview(artist, song.name)
            .then((result) => {
              if (result && result.preview && audio) {
                // iTunes 预览只有30秒，chorus 可能不在片段内，
                // 但仍然播放——有声音比没声音好
                try {
                  audio.src = result.preview;
                  audio.load();
                } catch {
                  /* ignore */
                }
              } else {
                // iTunes 也找不到，停止 loading
                setIsLoading(false);
                setIsPlaying(false);
              }
            })
            .catch(() => {
              setIsLoading(false);
              setIsPlaying(false);
            });
        } else {
          setIsLoading(false);
          setIsPlaying(false);
        }
      } else {
        setIsLoading(false);
        setIsPlaying(false);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // ---------- 打开试听 ----------
  const openAudition = useCallback(async (ent, artistName) => {
    if (!ent) return;

    // 重置每首歌的标记
    nidRef.current = ent.nid;
    triedMetingRef.current = false;
    triedITunesRef.current = false;
    artistRef.current = artistName || '';
    currentSongRef.current = ent;

    setCurrentSong(ent);
    setArtist(artistName || '');
    setVisible(true);
    setIsPlaying(false);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setChorusTime(ent.chorus || null);

    const audio = audioRef.current;

    // 无 nid -> 直接尝试 iTunes 预览（不再只跳转 QQ 搜索）
    if (!ent.nid) {
      try {
        const itunesResult = await findITunesPreview(artistName, ent.name);
        if (itunesResult && itunesResult.preview && audio) {
          // iTunes 预览只有30秒，不 seek chorus
          triedITunesRef.current = true;
          audio.src = itunesResult.preview;
          audio.load();
          return;
        }
      } catch {
        /* iTunes 也搜不到，回退到 QQ 搜索页 */
      }
      // iTunes 也没有 -> 打开 QQ 音乐搜索
      const q = encodeURIComponent((ent.name || '') + ' ' + (artistName || ''));
      try {
        window.open(QQ_SEARCH + q, '_blank');
      } catch {
        /* ignore popup block */
      }
      setVisible(false);
      setIsLoading(false);
      return;
    }

    // 有 nid -> 先尝试 BYFUNS_API 获取完整 URL
    let url = null;
    try {
      const res = await fetch(BYFUNS_API + ent.nid);
      if (res.ok) {
        const txt = await res.text();
        try {
          const j = JSON.parse(txt);
          url =
            j.url ||
            (j.data && (j.data.url || j.data)) ||
            (typeof j === 'string' ? j : null);
        } catch {
          // 非JSON，按纯文本URL处理
          url = txt.trim();
        }
      }
    } catch {
      /* 网络错误，回退 meting */
    }

    // 失败则用 METING_API 直链
    if (!url) {
      url = METING_API + ent.nid;
      triedMetingRef.current = true; // 已是回退，不再二次回退
    }

    if (audio && url) {
      try {
        audio.src = url;
        audio.load();
      } catch {
        /* ignore */
      }
    }
  }, []);

  // ---------- 关闭播放器 ----------
  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
      } catch {
        /* ignore */
      }
      audio.removeAttribute('src');
      try {
        audio.load();
      } catch {
        /* ignore */
      }
    }
    setVisible(false);
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setChorusTime(null);
    setCurrentSong(null);
    setArtist('');
    currentSongRef.current = null;
    nidRef.current = null;
    triedMetingRef.current = false;
    triedITunesRef.current = false;
    artistRef.current = '';
  }, []);

  // ---------- 播放/暂停 ----------
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  // ---------- 进度条 seek (pct: 0-1) ----------
  const seek = useCallback((pct) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const t = Math.max(0, Math.min(1, pct)) * audio.duration;
    try {
      audio.currentTime = t;
      setCurrentTime(t);
    } catch {
      /* ignore */
    }
  }, []);

  // ---------- 从头播放 ----------
  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    setCurrentTime(0);
    if (audio.src) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          /* ignore */
        });
    }
  }, []);

  // ---------- 派生值 ----------
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const fallbackNE = currentSong?.nid ? METING_API + currentSong.nid : '';
  const fallbackQQ = currentSong
    ? QQ_SEARCH + encodeURIComponent((currentSong.name || '') + ' ' + (artist || ''))
    : '';

  return {
    visible,
    currentSong,
    artist,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    chorusTime,
    progress,
    openAudition,
    closePlayer,
    togglePlay,
    seek,
    restart,
    fallbackNE,
    fallbackQQ,
    audioRef,
  };
}

export default useAudioPlayer;
