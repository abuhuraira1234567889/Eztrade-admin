"use client";

import { Link } from "react-router-dom";
import { EztradeLogo } from "@/components/cypher/EztradeLogo";

/** Logo + Beta lockup for member and admin sidebars. */
export function SidebarBrand({
  collapsed,
  homeHref = "/dashboard",
}: {
  collapsed: boolean;
  homeHref?: string;
}) {
  if (collapsed) {
    return (
      <Link
        to={homeHref}
        aria-label="EZ Trade"
        className="flex flex-col items-center gap-1"
      >
        <EztradeLogo wordmark={false} width={32} height={20} />
        <span
          className="text-[8px] uppercase font-bold tracking-wider text-purple"
          aria-label="Beta"
        >
          β
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={homeHref}
      aria-label="EZ Trade"
      className="flex items-center gap-2 min-w-0"
    >
      <EztradeLogo width={160} height={19} className="shrink-0" />
      <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md bg-purple-dim text-purple border border-purple/25 shrink-0">
        Beta
      </span>
    </Link>
  );
}
