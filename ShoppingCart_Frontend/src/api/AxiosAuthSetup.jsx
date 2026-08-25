import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axiosClient from "./axiosClient";

// Mounted once near the root of the app. Doesn't render anything —
// its only job is to keep axiosClient's outgoing requests carrying
// a fresh Auth0 access token.
export default function AxiosAuthSetup() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useEffect(() => {
    const interceptorId = axiosClient.interceptors.request.use(async (config) => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          config.headers.Authorization = `Bearer ${token}`;
        } catch {
          // Token silently failed to refresh (e.g. Auth0 session expired) —
          // let the request go out without a token; the backend will 401 it,
          // which is the correct outcome rather than silently retrying forever.
        }
      }
      return config;
    });

    // Cleanup: remove this interceptor if the component ever unmounts,
    // so re-mounting (e.g. in dev with StrictMode) doesn't stack duplicates.
    return () => axiosClient.interceptors.request.eject(interceptorId);
  }, [getAccessTokenSilently, isAuthenticated]);

  return null;
}