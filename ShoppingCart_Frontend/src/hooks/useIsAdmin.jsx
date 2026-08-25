import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { jwtDecode } from "jwt-decode";

const ROLES_CLAIM = "https://shoppingcart-api/claims/roles";

export function useIsAdmin() {
  const { getAccessTokenSilently, isAuthenticated, isLoading: auth0Loading } = useAuth0();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (auth0Loading) return;

    if (!isAuthenticated) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    getAccessTokenSilently()
      .then((token) => {
        const decoded = jwtDecode(token);
        const roles = decoded[ROLES_CLAIM] || [];
        setIsAdmin(roles.includes("Admin"));
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, auth0Loading, getAccessTokenSilently]);

  return { isAdmin, isLoading };
}