import React from "react";
import ReactDOM from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { BrowserRouter } from "react-router-dom";
import { AppUserProvider } from "./context/AppUserContext";
import { CartProvider } from "./context/CartContext";
import AxiosAuthSetup from "./api/AxiosAuthSetup";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <Auth0Provider
    domain={import.meta.env.VITE_AUTH0_DOMAIN}
    clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      scope: "openid profile email offline_access",
    }}
    useRefreshTokens={true}
    cacheLocation="localstorage"
  >
    <BrowserRouter>
      <AppUserProvider>
        <CartProvider>
          <AxiosAuthSetup />
          <App />
        </CartProvider>
      </AppUserProvider>
    </BrowserRouter>
  </Auth0Provider>
);