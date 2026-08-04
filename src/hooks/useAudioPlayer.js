// useAudioPlayer.js
// 音乐播放器状态管理 Hook（内联版，无弹窗）
//
// 负责:
//   - openAudition(ent, artistName): 开始试听某首歌
//       音频源优先级: 预取咪咕整曲 → 预取 iTunes 30s 预览 → 运行时 iTunes 搜索 → 网易云音乐 → QQ 音乐流媒体
//       （咪咕整曲优先：可全曲试听 + 自动定位高潮；iTunes 30s 预览为兜底；网易云/QQ 仅作最终回退）
//       loadedmetadata 时若有 chorus 且 duration>35s 则 seek 到 chorus 位置
//       canplay 时自动播放
//   - 播放/暂停、进度条 seek、"从头播放"、停止试听
//   - playingId 标识当前正在播放的 entrant.id，供卡片高亮

import { useCallback, useEffect, useRef, useState } from 'react';
import { findITunesPreview } from '../utils/itunes.js';
import { fetchQQSongUrl } from '../lib/api.js';
import { getNeteasePreviewUrl } from '../utils/netease.js';

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
  // 回退阶段: 0=初始, 1=iTunes预览失败→运行时搜索, 2=iTunes搜索失败→网易云,
  //           3=网易云失败→QQ音乐, 4=全部失败→搜索页
  const fallbackStageRef = useRef(0);
  const artistRef = useRef('');

  // 取消令牌：stopAudition 或新一轮 openAudition 时自增，
  // 旧的 in-flight openAudition 检测到令牌变化后立即退出
  const cancelTokenRef = useRef(0);

  // 降级回退函数：当音频源加载失败时，onError 调用此函数尝试下一个音源
  const fallbackFnRef = useRef(null);

  // 绑定 audio 事件监听（仅一次）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      const song = currentSongRef.current;
      const cs = song?.chorus;
      if (cs && audio.duration > 35) {
        // 有精确高潮数据 → seek 到指定位置
        try {
          audio.currentTime = cs;
        } catch {
          /* ignore seek errors */
        }
        setChorusTime(cs);
      } else if (audio.duration > 35) {
        // 无高潮数据 → 智能跳到 40% 位置（流行歌曲副歌通常在 35%-45%）
        const fallbackPos = Math.min(audio.duration * 0.4, audio.duration - 10);
        try {
          audio.currentTime = fallbackPos;
        } catch {
          /* ignore seek errors */
        }
        setChorusTime(fallbackPos);
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
      // 音频源加载失败时，尝试降级回退
      // 阶段 0/1: iTunes 预览失败 → 尝试运行时搜索
      // 阶段 2: 运行时搜索也失败 → 尝试网易云
      // 阶段 3: 网易云也失败 → 尝试 QQ 音乐
      // 阶段 4+: 全部失败 → 打开搜索页
      if (fallbackStageRef.current < 4 && fallbackFnRef.current) {
        fallbackStageRef.current++;
        setIsLoading(true);
        fallbackFnRef.current();
        return;
      }
      // 所有音源都失败 → 打开 QQ 音乐搜索页
      const song = currentSongRef.current;
      if (song) {
        const q = encodeURIComponent((song.name || '') + ' ' + (artistRef.current || ''));
        try {
          window.open(QQ_SEARCH + q, '_blank');
        } catch {
          /* ignore popup block */
        }
      }
      setPlayingId(null);
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
      fallbackStageRef.current = 0;
      artistRef.current = artistName || '';
      currentSongRef.current = ent;
      fallbackFnRef.current = null;

      setCurrentSong(ent);
      setPlayingId(ent.id);
      setArtist(artistName || '');
      setIsPlaying(false);
      setIsLoading(true);
      setCurrentTime(0);
      setDuration(0);
      setChorusTime(ent.chorus || null);

      const audio = audioRef.current;

      // iTunes 失败后依次尝试的降级链（定义一次，多个入口复用）
      // 阶段: 1=运行时 iTunes 搜索, 2=网易云, 3=QQ 流媒体, 4=搜索页
      const buildFallback = (startStage) => {
        fallbackStageRef.current = startStage;
        fallbackFnRef.current = async () => {
          const stage = fallbackStageRef.current;
          // 阶段 1: 运行时搜索 iTunes（对预取遗漏的歌曲兜底）
          if (stage === 1) {
            try {
              const itunesResult = await findITunesPreview(artistName, ent.name);
              if (cancelTokenRef.current !== myToken) return;
              if (itunesResult?.preview && audioRef.current) {
                audioRef.current.src = itunesResult.preview;
                audioRef.current.load();
                return;
              }
            } catch { /* 搜索失败 */ }
            fallbackStageRef.current = 2;
          }
          // 阶段 2: 网易云音乐（仅当 iTunes 确实无该歌时）
          if (fallbackStageRef.current === 2) {
            try {
              const neteaseUrl = await getNeteasePreviewUrl(
                ent.name, artistName, ent.nid,
              );
              if (cancelTokenRef.current !== myToken) return;
              if (neteaseUrl && audioRef.current) {
                audioRef.current.src = neteaseUrl;
                audioRef.current.load();
                return;
              }
            } catch { /* 网易云失败 */ }
            fallbackStageRef.current = 3;
          }
          // 阶段 3: QQ 音乐流媒体
          if (fallbackStageRef.current === 3 && ent.songmid) {
            try {
              const qqResult = await fetchQQSongUrl(ent.songmid);
              if (cancelTokenRef.current !== myToken) return;
              if (qqResult?.url && audioRef.current) {
                audioRef.current.src = qqResult.url;
                audioRef.current.load();
                return;
              }
            } catch { /* QQ 音乐失败 */ }
          }
          // 全部失败 → 打开搜索页
          fallbackStageRef.current = 4;
          if (cancelTokenRef.current !== myToken) return;
          const q = encodeURIComponent((ent.name || '') + ' ' + (artistName || ''));
          try { window.open(QQ_SEARCH + q, '_blank'); } catch { /* ignore */ }
          setPlayingId(null);
          setIsLoading(false);
          setIsPlaying(false);
        };
      };

      // ---------- 音频源：优先用预取的咪咕整曲（可整曲试听 + 自动定位高潮） ----------
      if (ent.miguPreviewUrl && audio) {
        buildFallback(1);
        audio.src = ent.miguPreviewUrl;
        audio.load();
        return;
      }

      // 预取 iTunes 30s 预览（Migu 无全曲时的兜底）
      if (ent.itunesPreviewUrl && audio) {
        // 预取命中：失败时补一次运行时 iTunes 搜索，之后不再逐级降级
        buildFallback(1);
        audio.src = ent.itunesPreviewUrl;
        audio.load();
        return;
      }

      // 预取数据缺失 → 运行时搜索 iTunes
      try {
        const itunesResult = await findITunesPreview(artistName, ent.name);
        if (cancelTokenRef.current !== myToken) return; // 已被取消
        if (itunesResult && itunesResult.preview && audio) {
          buildFallback(2);
          audio.src = itunesResult.preview;
          audio.load();
          return;
        }
      } catch {
        /* iTunes 搜不到 */
      }

      // iTunes 无此歌 → 尝试网易云音乐
      try {
        const neteaseUrl = await getNeteasePreviewUrl(
          ent.name, artistName, ent.nid,
        );
        if (cancelTokenRef.current !== myToken) return;
        if (neteaseUrl && audio) {
          buildFallback(3);
          audio.src = neteaseUrl;
          audio.load();
          return;
        }
      } catch {
        /* 网易云失败 */
      }

      // 网易云也搜不到 → 尝试 QQ 音乐流媒体 URL
      if (ent.songmid) {
        try {
          const qqResult = await fetchQQSongUrl(ent.songmid);
          if (cancelTokenRef.current !== myToken) return; // 已被取消
          if (qqResult?.url && audio) {
            buildFallback(4);
            audio.src = qqResult.url;
            audio.load();
            return;
          }
        } catch {
          /* QQ 音乐 purl 为空或请求失败 */
        }
      }

      // 所有音频源都失败 → 打开 QQ 音乐搜索页
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
    fallbackStageRef.current = 0;
    fallbackFnRef.current = null;
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
