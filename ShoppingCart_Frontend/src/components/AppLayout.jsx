import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAppUser } from "../context/AppUserContext";
import { useIsAdmin } from "../hooks/useIsAdmin";
import Navbar from "./Navbar";

export default function AppLayout() {
  const { isAuthenticated } = useAuth0();
  const { appUser, isReady } = useAppUser();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const location = useLocation();

  // Admins skip the shopping-preferences wizard — it isn't relevant to them.
  const needsOnboarding =
    isReady && isAuthenticated && appUser && !appUser.hasCompletedOnboarding && !adminLoading && !isAdmin;

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}