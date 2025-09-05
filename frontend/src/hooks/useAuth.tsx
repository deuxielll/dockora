import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { checkSetup as apiCheckSetup, checkAuth as apiCheckAuth, login as apiLogin, performSetup as apiPerformSetup, logout as apiLogout } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const verifyAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const setupRes = await apiCheckSetup();
      if (!setupRes.data.setup_complete) {
        setNeedsSetup(true);
        setIsLoggedIn(false);
        setCurrentUser(null);
      } else {
        setNeedsSetup(false);
        const authRes = await apiCheckAuth();
        setIsLoggedIn(authRes.data.is_logged_in);
        setCurrentUser(authRes.data.user);
      }
    } catch (error) {
      console.error("Auth check failed", error);
      setIsLoggedIn(false);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  const login = async (credentials) => {
    await apiLogin(credentials);
    await verifyAuth();
  };
  
  const setup = async (details) => {
    await apiPerformSetup(details);
    await verifyAuth();
  };

  const logout = async () => {
    await apiLogout();
    await verifyAuth();
  }

  const value = { isLoggedIn, needsSetup, isLoading, login, setup, logout, currentUser, verifyAuth };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};