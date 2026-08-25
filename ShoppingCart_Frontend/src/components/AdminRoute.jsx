import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useIsAdmin } from "../hooks/useIsAdmin";

export default function AdminRoute({ children }) {
  const { isLoading: auth0Loading } = useAuth0();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  if (auth0Loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Checking permissions...</p>
      </div>
    );
  }

  return isAdmin ? children : <Navigate to="/" replace />;
}