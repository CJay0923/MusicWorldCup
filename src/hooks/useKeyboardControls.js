// src/hooks/useKeyboardControls.js
// 从 App.jsx 抽取的键盘事件管理 hook
// 处理：Esc 关闭试听、Enter 处理浮层/确认、←/→ 或 A/L 选择晋级、1-4 四选二切换
//
// @param {object} opts - 键盘操作所需的全部上下文
// @param {object} opts.audio - useAudioPlayer 返回值
// @param {string} opts.selectedMode - 当前游戏模式
// @param {object} opts.wcState - useWorldCup 返回值
// @param {object} opts.gameState - useGameState 返回值
// @param {boolean} opts.isChampion - 是否在冠军界面
// @param {boolean} opts.gameStarted - 游戏是否已开始
// @param {function} opts.handlePick - 1v1 选择回调 (slot: 0|1) => void
// @param {function} opts.handleGroupToggle - 四选二切换 (memberIdx: number) => void

import { useEffect } from 'react';

export function useKeyboardControls({
  audio,
  selectedMode,
  wcState,
  gameState,
  isChampion,
  gameStarted,
  handlePick,
  handleGroupToggle,
}) {
  useEffect(() => {
    const handler = (e) => {
      // Escape 停止试听
      if (e.key === 'Escape' && audio.playingId != null) {
        audio.stopAudition();
        return;
      }

      // Enter 处理各类浮层 + 四选二确认
      if (e.key === 'Enter') {
        if (selectedMode === 'wc') {
          if (wcState.wc?.phase === 'draw') {
            wcState.proceedFromDraw();
            return;
          }
          if (wcState.wc?.phase === 'wildcard') {
            wcState.proceedFromWildcard();
            return;
          }
          // 四选二已改为选满 2 首自动晋级，无需 Enter 确认
        }
        if (gameState.showTransition) {
          gameState.dismissTransition();
          return;
        }
        if (wcState.showTransition) {
          wcState.dismissTransition();
          return;
        }
      }

      // 判断是否可操作
      const isBusy = selectedMode === 'wc' ? wcState.busy : gameState.busy;
      const overlayShown =
        selectedMode === 'wc'
          ? wcState.showTransition ||
            wcState.wc?.phase === 'draw' ||
            wcState.wc?.phase === 'wildcard'
          : gameState.showTransition;
      if (isBusy || overlayShown || isChampion || !gameStarted) return;

      // 四选二阶段：1/2/3/4 切换选中
      if (selectedMode === 'wc' && wcState.phase === 'group') {
        const g = wcState.wc?.groups?.[wcState.wc.curGroup];
        if (!g) return;
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 4) {
          e.preventDefault();
          handleGroupToggle(num - 1);
        }
        return;
      }

      // 判断是否在可选择的阶段
      const canPick =
        selectedMode === 'wc' ? wcState.phase === 'knockout' : true;
      if (!canPick) return;

      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handlePick(0);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handlePick(1);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    audio,
    selectedMode,
    wcState,
    gameState,
    isChampion,
    gameStarted,
    handlePick,
    handleGroupToggle,
  ]);
}

export default useKeyboardControls;
