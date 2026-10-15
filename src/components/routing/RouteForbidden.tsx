import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

/**
 * Shown when a staff user reaches an admin route their roles don't cover
 * (typed URL, stale bookmark, shared link). Rendered inside the admin shell so
 * the sidebar stays available and they can navigate somewhere they do own.
 */
export function RouteForbidden({ homeHref }: { homeHref: string }) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "60vh",
        textAlign: "center",
        gap: "1rem",
      }}
    >
      <div>
        <ShieldAlert className="w-8 h-8 text-purple" style={{ margin: "0 auto 0.75rem" }} aria-hidden />
        <h1 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          Not authorized
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", maxWidth: 420 }}>
          Your team role doesn't include this page. If you think that's wrong, ask a
          super admin to grant you the role.
        </p>
      </div>
      <Link to={homeHref} replace className="pill pill-purple">
        Go to my dashboard
      </Link>
    </div>
  );
}
