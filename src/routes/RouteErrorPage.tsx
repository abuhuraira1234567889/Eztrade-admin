import { useLayoutEffect } from "react";
import { useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShellSkeleton } from "@/components/cypher/Skeleton";
import { isChunkLoadError, reloadForStaleChunk } from "@/lib/lazy-import";

export function RouteErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation("common", { keyPrefix: "errors" });
  const staleChunk = isChunkLoadError(error);

  // Recover before paint so users don't see a scary error flash that fixes itself.
  useLayoutEffect(() => {
    if (staleChunk) reloadForStaleChunk();
  }, [staleChunk]);

  if (staleChunk) {
    return (
      <div className="min-h-screen bg-background">
        <ShellSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-display font-bold text-foreground">
          {t("genericTitle")}
        </h1>
        <p className="text-sm text-secondary-foreground leading-relaxed">
          {t("genericBody")}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple-700 transition"
        >
          {t("refresh")}
        </button>
      </div>
    </div>
  );
}
