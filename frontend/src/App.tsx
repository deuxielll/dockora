import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingSpinner from "./components/LoadingSpinner.tsx";
import { useAuth } from "./hooks/useAuth.tsx";
import SetupPage from "./pages/SetupPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import BottomNavBar from "./components/BottomNavBar.tsx";
import BackgroundManager from "./components/BackgroundManager.tsx";

const HomePage = lazy(() => import("./pages/HomePage.tsx"));
const ManagementPage = lazy(() => import("./pages/ManagementPage.tsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx"));
const FileManagerPage = lazy(() => import("./pages/FileManagerPage.tsx"));
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
  const isFileManager = activeTab === 'files';
  const isStackCreator = location.pathname === '/containers/create'; // Assuming this path for StackCreatorPage

  return (
    <div className="flex h-screen text-black dark:text-gray-200 font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className={`flex-1 overflow-x-hidden ${isFileManager || isStackCreator ? '' : 'overflow-y-auto no-scrollbar'} p-4 sm:p-6 pb-32`}>
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
      <Routes>
        <Route path="/login" element={!isLoggedIn ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/setup" element={needsSetup ? <SetupPage /> : <Navigate to="/login" />} />
        <Route path="/forgot-password" element={!isLoggedIn ? <ForgotPasswordPage /> : <Navigate to="/" />} />
        <Route path="/reset-password/:token" element={!isLoggedIn ? <ResetPasswordPage /> : <Navigate to="/" />} />
        
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/containers" element={<ManagementPage />} />
          <Route path="/containers/create" element={<StackCreatorPage onCancel={() => {}} onSuccess={() => {}} />} /> {/* Added route for StackCreatorPage */}
          <Route path="/files" element={<FileManagerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={isLoggedIn ? "/" : "/login"} />} />
      </Routes>
    </>
  );
}

export default App;