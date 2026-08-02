// ErrorBoundary.jsx — 全局错误边界组件
// 捕获子组件树渲染时的未处理异常，防止整个应用白屏。
// 提供"重置"按钮，清除 localStorage 存档后刷新页面恢复初始状态。

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // 生产环境可在此接入错误上报
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  handleReset = () => {
    // 清除游戏存档后刷新（保守策略，避免残留损坏的状态）
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('song_cup_'));
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  handleSoftReset = () => {
    // 仅刷新页面不清除存档（保留其他模式的进度）
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      return (
        <div className="flex min-h-dvh items-center justify-center p-6">
          <div className="max-w-[420px] rounded-xl border border-white/[0.08] bg-bg2 px-8 py-10 text-center shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
            <div className="mb-3 text-5xl">😵</div>
            <h2 className="mb-2 mt-0 text-[22px] font-black">出错了</h2>
            <p className="mb-6 mt-0 text-sm text-muted">
              应用遇到了一个意外错误。可以尝试直接刷新，或清除存档后重新开始。
            </p>
            {import.meta.env?.DEV && error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-xs text-muted">错误详情</summary>
                <pre className="max-h-50 overflow-x-auto rounded-lg bg-black/20 p-2 text-[11px] text-muted">
                  {error.toString()}
                  {errorInfo ? '\n' + errorInfo.componentStack : ''}
                </pre>
              </details>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.05] px-4 py-[10px] text-[13px] font-semibold text-white/80 transition-all duration-200 hover:border-white/30 hover:bg-white/[0.1] active:scale-[0.96]"
                type="button"
                onClick={this.handleSoftReset}
              >
                ↻ 刷新页面
              </button>
              <button
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-accent/60 bg-accent px-6 py-[10px] text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                type="button"
                onClick={this.handleReset}
              >
                ↺ 清除存档并重置
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
