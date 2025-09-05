import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth.jsx";
import { SettingsProvider } from "./hooks/useSettings.jsx";
import { NotificationsProvider } from "./hooks/useNotifications.jsx";
import { DeploymentProvider } from "./hooks/useDeployment.jsx";
import ToastProvider from "./components/ToastProvider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <NotificationsProvider>
            <DeploymentProvider>
              <App />
              <ToastProvider />
            </DeploymentProvider>
          </NotificationsProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);