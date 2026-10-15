import { Suspense } from "react";
import { GtmRouteTracker } from "@/components/GtmRouteTracker";
import { ShellSkeleton } from "@/components/cypher/Skeleton";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { lazyImport } from "@/lib/lazy-import";
import { ProtectedRoute } from "./ProtectedRoute";
import AdminLayout from "@/layouts/AdminLayout";
import { RouteErrorPage } from "./RouteErrorPage";
import { adminRoutes } from "./generated";

const LoginPage = lazyImport(() => import("@/pages/auth/LoginPage"));
const SignUpPage = lazyImport(() => import("@/pages/auth/SignUpPage"));
const ForgotPasswordPage = lazyImport(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazyImport(() => import("@/pages/auth/ResetPasswordPage"));
const AuthCallbackPage = lazyImport(() => import("@/pages/auth/AuthCallbackPage"));
const NotFoundPage = lazyImport(() => import("@/pages/NotFoundPage"));

function PageFallback() {
  return <ShellSkeleton />;
}

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function AuthLayout() {
  return (
    <ProtectedRoute guestOnly>
      <SuspenseWrap>
        <Outlet />
      </SuspenseWrap>
    </ProtectedRoute>
  );
}

function RootLayout() {
  return (
    <>
      <GtmRouteTracker />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    element: <RootLayout />,
    children: [
      { path: "/", element: <Navigate to="/admin" replace /> },
      {
        path: "/auth/callback",
        element: (
          <SuspenseWrap>
            <AuthCallbackPage />
          </SuspenseWrap>
        ),
      },
      {
        path: "/reset-password",
        element: (
          <SuspenseWrap>
            <ResetPasswordPage />
          </SuspenseWrap>
        ),
      },
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/sign-up", element: <SignUpPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      {
        element: <AdminLayout />,
        children: adminRoutes,
      },
      { path: "*", element: <SuspenseWrap><NotFoundPage /></SuspenseWrap> },
    ],
  },
]);
