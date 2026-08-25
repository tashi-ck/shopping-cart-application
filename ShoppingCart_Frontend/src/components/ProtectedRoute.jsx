import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
import { useAppUser } from "../context/AppUserContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth0();
  const { isReady } = useAppUser();

  if (isLoading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Checking your session...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
}