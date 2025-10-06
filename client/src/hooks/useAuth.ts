import { useState, useEffect, useCallback } from 'react';
import jwtDecode from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  tier: 'observer' | 'navigator' | 'operator' | 'sovereign';
  name?: string;
}

interface DecodedToken {
  sub: string;
  email: string;
  tier: string;
  name?: string;
  exp: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const decodeAndSetUser = useCallback((token: string) => {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const now = Date.now() / 1000;
      
      if (decoded.exp < now) {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        return false;
      }

      setUser({
        id: decoded.sub,
        email: decoded.email,
        tier: decoded.tier as User['tier'],
        name: decoded.name,
      });
      return true;
    } catch (error) {
      console.error('Failed to decode token:', error);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      return false;
    }
  }, []);

  const refreshToken = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem(TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      }
      decodeAndSetUser(data.access_token);
    } catch (error) {
      console.error('Token refresh error:', error);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
      throw error;
    }
  }, [decodeAndSetUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem(TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      }
      decodeAndSetUser(data.access_token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [decodeAndSetUser]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const isValid = decodeAndSetUser(token);
      if (!isValid) {
        refreshToken().catch(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [decodeAndSetUser, refreshToken]);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const expiresIn = decoded.exp * 1000 - Date.now();
      const refreshTime = expiresIn - 5 * 60 * 1000;

      if (refreshTime > 0) {
        const timeoutId = setTimeout(() => {
          refreshToken().catch(console.error);
        }, refreshTime);

        return () => clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Token expiry check error:', error);
    }
  }, [user, refreshToken]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshToken,
  };
};
