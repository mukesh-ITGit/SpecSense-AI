import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginCredentials, RegisterCredentials } from '../types';
import { api } from '../services/api';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'offline';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  connectionStatus: ConnectionStatus;
  checkConnection: () => Promise<boolean>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('specsense_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('specsense_auth_token') || null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const checkConnection = async (): Promise<boolean> => {
    setConnectionStatus((prev) => (prev === 'offline' ? 'reconnecting' : 'connecting'));
    try {
      await api.checkHealth();
      setConnectionStatus('connected');
      return true;
    } catch {
      setConnectionStatus('offline');
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // 1. Initial health check
      let isLive = false;
      try {
        await api.checkHealth();
        if (isMounted) {
          setConnectionStatus('connected');
          isLive = true;
        }
      } catch {
        if (isMounted) {
          setConnectionStatus('offline');
        }
      }

      // 2. Token verification if stored
      const storedToken = localStorage.getItem('specsense_auth_token');
      if (storedToken) {
        if (isLive) {
          try {
            const userData = await api.getMe();
            if (isMounted) {
              setUser(userData);
              localStorage.setItem('specsense_user', JSON.stringify(userData));
            }
          } catch (err: any) {
            // Only clear token if the server explicitly rejected the credentials (401 / 403)
            if (err?.response?.status === 401 || err?.response?.status === 403) {
              if (isMounted) {
                localStorage.removeItem('specsense_auth_token');
                localStorage.removeItem('specsense_user');
                setToken(null);
                setUser(null);
              }
            }
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await api.login(credentials);
    setToken(response.access_token);
    setUser(response.user);
    setConnectionStatus('connected');
    localStorage.setItem('specsense_auth_token', response.access_token);
    localStorage.setItem('specsense_user', JSON.stringify(response.user));
  };

  const register = async (credentials: RegisterCredentials) => {
    const response = await api.register(credentials);
    setToken(response.access_token);
    setUser(response.user);
    setConnectionStatus('connected');
    localStorage.setItem('specsense_auth_token', response.access_token);
    localStorage.setItem('specsense_user', JSON.stringify(response.user));
  };

  const logout = () => {
    api.logout().catch(() => {});
    localStorage.removeItem('specsense_auth_token');
    localStorage.removeItem('specsense_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        connectionStatus,
        checkConnection,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
