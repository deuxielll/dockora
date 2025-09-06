import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth.tsx";
import { SettingsProvider } from "./hooks/useSettings.tsx";
import { NotificationsProvider } from "./hooks/useNotifications.tsx";
import { DeploymentProvider } from "./hooks/useDeployment.tsx";
import ToastProvider from "./components/ToastProvider.tsx";

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