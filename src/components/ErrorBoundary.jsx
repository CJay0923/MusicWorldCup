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
      const keys = Object.keys(localStorage).filter(
        (k) => k.startsWith('song_cup_'),
      );
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
        <div className="error-boundary">
          <div className="error-boundary-inner">
            <div className="error-icon">😵</div>
            <h2>出错了</h2>
            <p>应用遇到了一个意外错误。可以尝试重置后重新开始。</p>
            {import.meta.env?.DEV && error && (
              <details className="error-details">
                <summary>错误详情</summary>
                <pre>
                  {error.toString()}
                  {errorInfo ? '\n' + errorInfo.componentStack : ''}
                </pre>
              </details>
            )}
            <button
              className="btn primary"
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
