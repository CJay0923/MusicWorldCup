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

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      return (
        <div className="flex min-h-dvh items-center justify-center p-6">
          <div className="max-w-[420px] rounded-lg border border-white/10 bg-bg2 px-8 py-10 text-center shadow-[--shadow]">
            <div className="mb-3 text-5xl">😵</div>
            <h2 className="mb-2 mt-0 text-[22px] font-black">出错了</h2>
            <p className="mb-6 mt-0 text-sm text-muted">
              应用遇到了一个意外错误。可以尝试重置后重新开始。
            </p>
            {import.meta.env?.DEV && error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-xs text-muted">错误详情</summary>
                <pre className="max-h-[200px] overflow-x-auto rounded-lg bg-black/20 p-2 text-[11px] text-muted">
                  {error.toString()}
                  {errorInfo ? '\n' + errorInfo.componentStack : ''}
                </pre>
              </details>
            )}
            <button
              className="inline-flex cursor-pointer items-center gap-[7px] rounded-full border-none bg-accent px-6 py-[10px] text-[13px] font-bold text-bg transition-all duration-200 hover:brightness-105 active:scale-[0.97]"
              type="button"
              onClick={this.handleReset}
            >
              ↺ 重置并刷新
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
