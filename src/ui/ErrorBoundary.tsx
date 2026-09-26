import { Component, type ReactNode } from 'react';

/**
 * 画面を描く途中で例外が出たときの受け止め役。画面が真っ白のまま止まらないよう、読み込み直す道を出す。
 * 記録は保存の窓口（localStorage）に残っているので、読み込み直せば続きから遊べる
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    console.error(error);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="app">
        <div className="page crash" role="alert" data-testid="crash">
          <p>問題が起きて画面を描けなかった。記録は端末に残っている。</p>
          <button className="btn btn-primary wide" onClick={() => window.location.reload()} data-testid="crash-reload">
            読み込み直す
          </button>
        </div>
      </div>
    );
  }
}
