import { cn } from "@/lib/utils";

type ShimmerProps = {
  className?: string;
  style?: React.CSSProperties;
};

/** Animated placeholder bar - matches old platform skeleton shapes with shimmer sweep. */
export function Shimmer({ className, style }: ShimmerProps) {
  return <div className={cn("shimmer rounded bg-surface-soft", className)} style={style} aria-hidden />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 md:mb-8">
      <Shimmer className="h-3 w-32" />
      <Shimmer className="mt-3 h-8 w-72 max-w-full rounded-lg" />
      <Shimmer className="mt-3 h-4 w-96 max-w-full" />
    </div>
  );
}

function CardGrid({ count, className }: { count: number; className: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} className={className} />
      ))}
    </>
  );
}

export type PageSkeletonVariant = "default" | "dashboard" | "journal" | "compact" | "tradeIdeas";

export function PageSkeleton({ variant = "default" }: { variant?: PageSkeletonVariant }) {
  if (variant === "tradeIdeas") {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-start gap-4 mb-6">
          <Shimmer className="w-12 h-12 rounded-lg" />
          <div className="flex-1">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="mt-2 h-6 w-72 max-w-full" />
          </div>
        </div>

        <div className="space-y-3">
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-[90%]" />
          <Shimmer className="h-4 w-[40%]" />
        </div>

        <div className="space-y-4">
          <Shimmer className="h-3 w-24" />
          <div className="space-y-10">
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <Shimmer className="w-full aspect-video" />
              <div className="p-4 space-y-2">
                <Shimmer className="h-3 w-32" />
                <Shimmer className="h-5 w-64 max-w-full" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <Shimmer className="w-full aspect-video" />
              <div className="p-4 space-y-2">
                <Shimmer className="h-3 w-32" />
                <Shimmer className="h-5 w-64 max-w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="min-h-[40vh] space-y-4 py-2">
        <PageHeaderSkeleton />
        <div className="grid gap-3 md:grid-cols-2">
          <Shimmer className="h-28 rounded-xl border border-border" />
          <Shimmer className="h-28 rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  if (variant === "journal") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="mt-2 h-3 w-64 max-w-full" />
          </div>
          <Shimmer className="h-8 w-36 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <CardGrid count={6} className="h-24 rounded-xl border border-border" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Shimmer className="h-28 rounded-xl border border-border" />
          <Shimmer className="h-28 rounded-xl border border-border" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Shimmer className="h-72 rounded-xl border border-border" />
          <Shimmer className="h-72 rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div>
        <PageHeaderSkeleton />
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <CardGrid count={2} className="h-44 rounded-xl border border-border" />
        </div>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Shimmer className="h-28 rounded-xl border border-border" />
          <Shimmer className="hidden h-28 rounded-xl border border-border md:block" />
        </div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
          <CardGrid count={5} className="h-28 rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <CardGrid count={4} className="h-24 rounded-xl border border-border" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Shimmer className="h-64 rounded-xl border border-border" />
        <Shimmer className="h-64 rounded-xl border border-border" />
      </div>
    </div>
  );
}

/** Full-screen shell placeholder while auth + sidebar chrome loads. */
export function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 pt-20 sm:px-6 md:px-8">
      <PageSkeleton />
    </div>
  );
}

/** Chart lazy-load fallback - journal equity / monthly / radar blocks. */
export function ChartSkeleton({
  height = 220,
  bare = false,
}: {
  height?: number;
  bare?: boolean;
}) {
  const inner = (
    <div>
      <Shimmer className="h-3 w-28" />
      <Shimmer className="mt-3 rounded-lg" style={{ height }} />
    </div>
  );
  if (bare) return inner;
  return <div className="rounded-xl border border-border bg-surface p-5">{inner}</div>;
}
