import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  error: Error | null;
  hasError: boolean;
};

export class ErrorBoundaryHarness extends Component<Props, State> {
  public override state: State = {
    error: null,
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundaryHarness] Unhandled Exception Caught:', error, errorInfo);
    if (
      typeof window !== 'undefined' &&
      (error.message?.includes('dynamically imported module') ||
        error.message?.includes('Failed to fetch') ||
        error.name === 'ChunkLoadError')
    ) {
      const key = 'eojob_chunk_reload_attempt';
      if (!window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, 'true');
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    this.setState({ error: null, hasError: false });
  };

  private handleGoHome = () => {
    this.setState({ error: null, hasError: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <main className="grid min-h-screen place-items-center bg-[#F7F7F8] px-4 py-8 text-[#171719]">
          <section className="flex w-full max-w-md flex-col items-center rounded-3xl border border-[#E1E2E4] bg-white p-6 text-center shadow-xl sm:p-8">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#FFF0E6] text-[#FF5E00] shadow-xs">
              <AlertTriangle className="size-7" />
            </div>

            <h1 className="mt-4 text-xl font-bold text-[#171719] sm:text-2xl">
              화면을 불러오는 중 오류가 발생했습니다
            </h1>

            <p className="mt-2 text-sm font-medium leading-relaxed text-[#70737C]">
              일시적인 문제일 수 있습니다. 다시 시도하시거나 메인 화면으로 이동해 주세요.
            </p>

            {this.state.error?.message ? (
              <div className="mt-4 w-full rounded-xl border border-[#E1E2E4] bg-[#F7F7F8] p-3 text-left">
                <p className="truncate text-xs font-mono font-medium text-[#70737C]">
                  {this.state.error.message}
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#005EEB] bg-[#005EEB] px-4 text-sm font-bold text-white shadow-xs transition hover:bg-[#0054D1] active:scale-[0.98]"
              >
                <RefreshCw className="size-4" />
                <span>다시 시도</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E1E2E4] bg-white px-4 text-sm font-bold text-[#171719] shadow-2xs transition hover:bg-[#F7F7F8] hover:border-[#C2C4C8] active:scale-[0.98]"
              >
                <Home className="size-4" />
                <span>홈으로 이동</span>
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
