"use client";

import { useRedirect } from "@/lib/useRedirect";

/**
 * /admin has no page of its own - the panel is a set of sub-routes
 * (users, live-events, team, …). Bare /admin used to 404; redirect it to
 * the first section. The admin layout still gates access via is_staff().
 */
export default function AdminIndex() {
  useRedirect("/admin/users");
  return null;
}
