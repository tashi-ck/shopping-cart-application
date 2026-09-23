import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { getOrSyncUser } from "../api/userApi";

const AppUserContext = createContext(null);

export function AppUserProvider({ children }) {
  const { isAuthenticated, isLoading: auth0Loading, logout } = useAuth0();
  const [appUser, setAppUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deactivatedMessage, setDeactivatedMessage] = useState("");

  // Pulled out so both the initial sync AND the onboarding wizard (after it
  // submits) can refresh appUser without duplicating this fetch/error logic.
  const refreshAppUser = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsSyncing(true);
    try {
      const res = await getOrSyncUser();
      setAppUser(res.data);
    } catch (err) {
      setAppUser(null);
      if (err.response?.status === 403) {
        setDeactivatedMessage(err.response.data);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAppUser(null);
      return;
    }
    refreshAppUser();
  }, [isAuthenticated, refreshAppUser]);

  useEffect(() => {
    const handleDeactivated = (e) => setDeactivatedMessage(e.detail);
    window.addEventListener("account:deactivated", handleDeactivated);
    return () => window.removeEventListener("account:deactivated", handleDeactivated);
  }, []);

  useEffect(() => {
    if (deactivatedMessage) {
      logout({ logoutParams: { returnTo: window.location.origin } });
    }
  }, [deactivatedMessage, logout]);

  return (
    <AppUserContext.Provider value={{ appUser, isReady: !auth0Loading && !isSyncing, refreshAppUser }}>
      {children}
    </AppUserContext.Provider>
  );
}

export const useAppUser = () => useContext(AppUserContext);