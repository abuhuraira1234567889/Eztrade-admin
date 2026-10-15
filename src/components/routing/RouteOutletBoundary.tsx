import { Component, Suspense, type ReactNode } from "react";
import i18n from "@/i18n";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { isChunkLoadError, reloadForStaleChunk } from "@/lib/lazy-import";

type Props = { children: ReactNode };
type State = { hasError: boolean; chunkError: boolean; remountKey: number };

/**
 * Catches lazy-route / chunk failures inside a layout shell so the sidebar
 * stays visible and we recover silently instead of replacing the whole app.
 */
class RouteOutletBoundaryInner extends Component<Props, State> {
  private retryTimer: number | undefined;

  state: State = { hasError: false, chunkError: false, remountKey: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return {
      hasError: true,
      chunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: unknown) {
    if (!isChunkLoadError(error)) return;

    if (reloadForStaleChunk()) return;

    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => {
      this.setState((prev) => ({
        hasError: false,
        chunkError: false,
        remountKey: prev.remountKey + 1,
      }));
    }, 600);
  }

  componentWillUnmount() {
    window.clearTimeout(this.retryTimer);
  }

  private retry = () => {
    this.setState((prev) => ({
      hasError: false,
      chunkError: false,
      remountKey: prev.remountKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.state.chunkError) return <PageSkeleton />;
      return (
        <div className="rounded-xl border border-border bg-surface p-8 text-center max-w-md mx-auto my-8">
          <p className="text-sm text-secondary-foreground leading-relaxed">
            {i18n.t("errors.genericBody", { ns: "common" })}
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-4 inline-flex items-center justify-center h-10 px-5 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple-700 transition"
          >
            {i18n.t("errors.refresh", { ns: "common" })}
          </button>
        </div>
      );
    }

    return <div key={this.state.remountKey}>{this.props.children}</div>;
  }
}

export function RouteOutletShell({ children }: Props) {
  return (
    <RouteOutletBoundaryInner>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </RouteOutletBoundaryInner>
  );
}
