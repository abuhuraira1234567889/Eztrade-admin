import { ShellSkeleton } from "@/components/cypher/Skeleton";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When true, redirects authenticated users away (auth pages). */
  guestOnly?: boolean;
}

export function ProtectedRoute({ children, guestOnly }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <ShellSkeleton />
    );
  }

  if (guestOnly && user) {
    return <Navigate to="/" replace />;
  }

  if (!guestOnly && !user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
