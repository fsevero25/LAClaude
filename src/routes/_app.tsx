import React from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "~/lib/auth";
import { AppLayout } from "~/components/AppLayout";

export const Route = createFileRoute("/_app")({
  component: AppLayoutRoute,
});

function AppLayoutRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
          color: "var(--muted)",
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: "none" }}>
        {/* Redirect happens via effect below */}
        <RedirectToLogin />
      </div>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function RedirectToLogin() {
  const navigate = Route.useNavigate();
  React.useEffect(() => {
    navigate({ to: "/" });
  }, [navigate]);
  return null;
}
