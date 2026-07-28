// useAudioPlayer.js
// 音乐播放器状态管理 Hook（内联版，无弹窗）
//
// 负责:
//   - openAudition(ent, artistName): 开始试听某首歌
//       音频回退链: QQ 音乐 m4a (songmid) → 网易云 (nid 懒匹配 → BYFUNS → METING) → iTunes 30s
//       loadedmetadata 时若有 chorus 且 duration>35s 则 seek 到 chorus 位置
//       canplay 时自动播放
//   - 播放/暂停、进度条 seek、"从头播放"、停止试听
//   - playingId 标识当前正在播放的 entrant.id，供卡片高亮

import { useCallback, useEffect, useRef, useState } from 'react';
import { BYFUNS_API, METING_API } from '../data/singers.js';
import { findITunesPreview } from '../utils/itunes.js';
import { fetchQQSongUrl } from '../lib/api.js';
import { matchNid } from '../utils/nidMatcher.js';

const QQ_SEARCH = 'https://y.qq.com/n/ryqq/search?w=';

export function useAudioPlayer() {
  const audioRef = useRef(null);

  const [currentSong, setCurrentSong] = useState(null);
  const [playingId, setPlayingId] = useState(null);
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
  const triedQQRef = useRef(false);
  const triedNidLazyRef = useRef(false);
  const triedOuterUrlRef = useRef(false);
  const artistRef = useRef('');

  // 取消令牌：stopAudition 或新一轮 openAudition 时自增，
  // 旧的 in-flight openAudition 检测到令牌变化后立即退出
  const cancelTokenRef = useRef(0);

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
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    const onError = () => {
      const audio = audioRef.current;
      if (!audio) return;
      // stopAudition 已清空 currentSongRef，忽略因此触发的 error 事件
      if (!currentSongRef.current) return;
      const song = currentSongRef.current;
      const nid = nidRef.current;
      const artistName = artistRef.current;

      // 回退链: 网易云 BYFUNS → METING → iTunes 30s
      // QQ 音乐 m4a 已在 openAudition 中尝试过，这里处理后续回退

      // 有 nid 且未试过 meting -> 切换到 METING_API 直链
      if (nid && !triedMetingRef.current) {
        triedMetingRef.current = true;
        setIsLoading(true);
        try {
          audio.src = METING_API + nid;
          audio.load();
        } catch {
          /* ignore */
        }
        return;
      }

      // METING 失败 -> 尝试网易云外链直链
      if (nid && !triedOuterUrlRef.current) {
        triedOuterUrlRef.current = true;
        setIsLoading(true);
        try {
          audio.src = `https://music.163.com/song/media/outer/url?id=${nid}.mp3`;
          audio.load();
        } catch {
          /* ignore */
        }
        return;
      }

      // 网易云全部走不通 -> 尝试 iTunes 预览兜底
      if (!triedITunesRef.current) {
        triedITunesRef.current = true;
        setIsLoading(true);
        if (song && song.name) {
          findITunesPreview(artistName, song.name)
            .then((result) => {
              // stopAudition 期间已清空 currentSongRef，放弃设置 audio.src
              if (!currentSongRef.current) return;
              if (result && result.preview && audio) {
                try {
                  audio.src = result.preview;
                  audio.load();
                } catch {
                  /* ignore */
                }
              } else {
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
        return;
      }

      // 所有回退都失败
      setIsLoading(false);
      setIsPlaying(false);
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

  // ---------- 开始试听 ----------
  const openAudition = useCallback(
    async (ent, artistName) => {
      if (!ent) return;

      // 获取本次调用的取消令牌，并使先前 in-flight 的 openAudition 失效
      const myToken = ++cancelTokenRef.current;

      // 若点击的是当前正在播放的歌，切换播放/暂停
      if (
        currentSongRef.current &&
        currentSongRef.current.id === ent.id &&
        audioRef.current?.src
      ) {
        const audio = audioRef.current;
        if (audio.paused) {
          audio
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        } else {
          audio.pause();
          setIsPlaying(false);
        }
        return;
      }

      // 重置每首歌的标记
      nidRef.current = ent.nid;
      triedMetingRef.current = false;
      triedITunesRef.current = false;
      triedQQRef.current = false;
      triedNidLazyRef.current = false;
      triedOuterUrlRef.current = false;
      artistRef.current = artistName || '';
      currentSongRef.current = ent;

      setCurrentSong(ent);
      setPlayingId(ent.id);
      setArtist(artistName || '');
      setIsPlaying(false);
      setIsLoading(true);
      setCurrentTime(0);
      setDuration(0);
      setChorusTime(ent.chorus || null);

      const audio = audioRef.current;

      // ---------- 音频回退链 ----------
      // 1. 有 songmid -> 先尝试 QQ 音乐 m4a
      if (ent.songmid && !triedQQRef.current) {
        triedQQRef.current = true;
        try {
          const { url } = await fetchQQSongUrl(ent.songmid);
          if (cancelTokenRef.current !== myToken) return; // 已被取消
          if (url && audio) {
            audio.src = url;
            audio.load();
            return; // QQ 音乐 URL 加载成功，等待 canplay
          }
        } catch {
          /* QQ 失败，继续回退 */
        }
      }

      // 2. QQ 失败或无 songmid -> 尝试网易云
      //    若无 nid，先懒匹配
      let nid = ent.nid;
      if (!nid && !triedNidLazyRef.current) {
        triedNidLazyRef.current = true;
        try {
          nid = await matchNid(ent.name, artistName || '');
          if (cancelTokenRef.current !== myToken) return; // 已被取消
          if (nid) {
            nidRef.current = nid;
          }
        } catch {
          /* 懒匹配失败 */
        }
      }

      if (nid && audio) {
        // 有 nid -> 先尝试 BYFUNS_API 获取完整 URL
        let url = null;
        try {
          const res = await fetch(BYFUNS_API + nid);
          if (cancelTokenRef.current !== myToken) return; // 已被取消
          if (res.ok) {
            const txt = await res.text();
            try {
              const j = JSON.parse(txt);
              url =
                j.url ||
                (j.data && (j.data.url || j.data)) ||
                (typeof j === 'string' ? j : null);
            } catch {
              url = txt.trim();
            }
          }
        } catch {
          /* 网络错误，回退 meting */
        }

        if (!url) {
          url = METING_API + nid;
          triedMetingRef.current = true;
        }

        if (url) {
          try {
            audio.src = url;
            audio.load();
          } catch {
            /* ignore */
          }
          return;
        }
      }

      // 3. 无 nid 或网易云也失败 -> iTunes 30s 预览
      try {
        const itunesResult = await findITunesPreview(artistName, ent.name);
        if (cancelTokenRef.current !== myToken) return; // 已被取消
        if (itunesResult && itunesResult.preview && audio) {
          triedITunesRef.current = true;
          audio.src = itunesResult.preview;
          audio.load();
          return;
        }
      } catch {
        /* iTunes 也搜不到 */
      }

      // 4. 全部失败 -> 打开 QQ 音乐搜索页
      const q = encodeURIComponent((ent.name || '') + ' ' + (artistName || ''));
      try {
        window.open(QQ_SEARCH + q, '_blank');
      } catch {
        /* ignore popup block */
      }
      setPlayingId(null);
      setIsLoading(false);
    },
    [],
  );

  // ---------- 停止试听 ----------
  const stopAudition = useCallback(() => {
    // 使任何 in-flight 的 openAudition 失效
    cancelTokenRef.current++;
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
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setChorusTime(null);
    setCurrentSong(null);
    setPlayingId(null);
    setArtist('');
    currentSongRef.current = null;
    nidRef.current = null;
    triedMetingRef.current = false;
    triedITunesRef.current = false;
    triedQQRef.current = false;
    triedNidLazyRef.current = false;
    triedOuterUrlRef.current = false;
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

  return {
    currentSong,
    playingId,
    artist,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    chorusTime,
    progress,
    openAudition,
    stopAudition,
    togglePlay,
    seek,
    restart,
    audioRef,
  };
}

export default useAudioPlayer;
