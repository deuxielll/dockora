"use client";

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingSpinner from "./components/LoadingSpinner.tsx";
import { useAuth } from "./hooks/useAuth.tsx";
import SetupPage from "./pages/SetupPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import BottomNavBar from "./components/BottomNavBar.tsx";
import BackgroundManager from "./components/BackgroundManager.tsx";
import PopoutWidgetPage from "./pages/PopoutWidgetPage.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

const HomePage = lazy(() => import("./pages/HomePage.tsx"));
const ManagementPage = lazy(() => import("./pages/ManagementPage.tsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx"));
// FileManagerPage is removed
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.tsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.tsx"));

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const DashboardLayout = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const activeTab = location.pathname === '/' ? 'home' : location.pathname.split('/')[1];
  // isFileManager is no longer needed as the page is removed

  return (
    <div className="flex h-screen text-black dark:text-gray-200 font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className={`flex-1 overflow-x-hidden p-4 sm:p-6 pb-28 overflow-y-auto no-scrollbar`}>
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNavBar activeTab={activeTab} currentUser={currentUser} />
    </div>
  );
};

function App() {
  const { isLoggedIn, needsSetup, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BackgroundManager />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <BackgroundManager />
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={!isLoggedIn ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/setup" element={needsSetup ? <SetupPage /> : <Navigate to="/login" />} />
          <Route path="/forgot-password" element={!isLoggedIn ? <ForgotPasswordPage /> : <Navigate to="/" />} />
          <Route path="/reset-password/:token" element={!isLoggedIn ? <ResetPasswordPage /> : <Navigate to="/" />} />
          
          {/* New route for pop-out widgets */}
          <Route path="/widget/:widgetId" element={<ProtectedRoute><PopoutWidgetPage /></ProtectedRoute>} />

          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/" element={<HomePage />} />
            <Route path="/containers" element={<ManagementPage />} />
            {/* FileManagerPage route removed */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to={isLoggedIn ? "/" : "/login"} />} />
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export default App;