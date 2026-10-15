import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import "@fontsource-variable/urbanist";
import "@fontsource-variable/jetbrains-mono";
import "@/styles/globals.css";
import "@/i18n";
import { AuthProvider } from "@/providers/AuthProvider";
import { router } from "@/routes";
import { ShellSkeleton } from "@/components/cypher/Skeleton";
import { reloadForStaleChunk } from "@/lib/lazy-import";

// Recover when Vite detects a stale preloaded chunk after a deploy.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadForStaleChunk();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <Suspense fallback={<ShellSkeleton />}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "font-body",
            title: "font-display font-semibold",
          },
          style: {
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
          },
        }}
      />
    </AuthProvider>
  </StrictMode>,
);
