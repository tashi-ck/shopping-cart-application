import { createContext, useContext, useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { getOrSyncUser } from "../api/userApi";

const AppUserContext = createContext(null);

export function AppUserProvider({ children }) {
  const { isAuthenticated, isLoading: auth0Loading, logout } = useAuth0();
  const [appUser, setAppUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deactivatedMessage, setDeactivatedMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setAppUser(null);
      return;
    }

    setIsSyncing(true);
    getOrSyncUser()
      .then((res) => setAppUser(res.data))
      .catch((err) => {
        setAppUser(null);
        // Covers the case where the account was already deactivated BEFORE this sync ran
        if (err.response?.status === 403) {
          setDeactivatedMessage(err.response.data);
        }
      })
      .finally(() => setIsSyncing(false));
  }, [isAuthenticated]);

  useEffect(() => {
    // Covers deactivation happening WHILE the user is actively using the app
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
    <AppUserContext.Provider value={{ appUser, isReady: !auth0Loading && !isSyncing }}>
      {children}
    </AppUserContext.Provider>
  );
}

export const useAppUser = () => useContext(AppUserContext);