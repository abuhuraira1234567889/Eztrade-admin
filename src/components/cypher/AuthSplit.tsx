"use client";

import type { ReactNode } from "react";
import { AuthBrandPanel } from "@/components/cypher/AuthBrandPanel";
import { AuthThemeToggle } from "@/components/cypher/AuthThemeToggle";

/**
 * AuthSplit - full-height split-screen auth shell.
 *   • Left  : the branding/info panel, hidden below lg (desktop-only).
 *   • Right : {children} (the existing form), centered, full width on mobile.
 *
 * Works in light + dark: the panel and the right column both sit on
 * `bg-background` (= --bg-page) so the seam is a single hairline border, never
 * a colour change. The right column reproduces the pages' existing centering
 * so forms drop straight in WITHOUT changing any markup or submit logic.
 */
export function AuthSplit({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full bg-background">
      {/* Theme switcher - pinned top-right over the form column, on every auth page.
          Wrapped in a positioned div because the toggle itself is `relative`
          (its sun/moon icons stack absolutely inside it). */}
      <div className="absolute right-4 top-4 z-20">
        <AuthThemeToggle />
      </div>

      {/* LEFT - branding panel (self-gates to hidden lg:flex internally) */}
      <AuthBrandPanel />

      {/* RIGHT - the existing form, centered and full width below lg */}
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
