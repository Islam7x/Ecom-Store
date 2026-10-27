import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import { CartProvider } from "./context/CartContext";
import { LocationProvider } from "./context/LocationContext";
import { WishlistProvider } from "./context/WishlistContext";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const app = (
  <CartProvider>
    <WishlistProvider>
      <LocationProvider>
        <App />
      </LocationProvider>
    </WishlistProvider>
  </CartProvider>
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
    ) : (
      app
    )}
  </StrictMode>,
);
