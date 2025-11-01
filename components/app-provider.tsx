'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { type Role } from './role-toggle';
import { type Locale } from '@/lib/i18n';
import { Toaster } from '@/components/ui/sonner';

interface MockUser {
  id: string;
  email: string;
  name: string;
}

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isAuthenticated: boolean;
  user: MockUser | null;
  signIn: (email: string, name?: string) => void;
  signOut: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('user');
  const [locale, setLocale] = useState<Locale>('en');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<MockUser | null>(null);

  useEffect(() => {
    const storedAuth = sessionStorage.getItem('mock_auth');
    const storedRole = sessionStorage.getItem('mock_role');
    const storedUser = sessionStorage.getItem('mock_user');

    if (storedAuth === 'true' && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
      if (storedRole) {
        setRole(storedRole as Role);
      }
    }
  }, []);

  const signIn = (email: string, name?: string) => {
    const mockUser: MockUser = {
      id: Math.random().toString(36).substring(7),
      email,
      name: name || email.split('@')[0],
    };
    setIsAuthenticated(true);
    setUser(mockUser);
    sessionStorage.setItem('mock_auth', 'true');
    sessionStorage.setItem('mock_user', JSON.stringify(mockUser));
    sessionStorage.setItem('mock_role', role);
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setUser(null);
    setRole('user');
    sessionStorage.removeItem('mock_auth');
    sessionStorage.removeItem('mock_user');
    sessionStorage.removeItem('mock_role');
  };

  const handleSetRole = (newRole: Role) => {
    setRole(newRole);
    if (isAuthenticated) {
      sessionStorage.setItem('mock_role', newRole);
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AppContext.Provider value={{
        role,
        setRole: handleSetRole,
        locale,
        setLocale,
        isAuthenticated,
        user,
        signIn,
        signOut
      }}>
        {children}
        <Toaster />
      </AppContext.Provider>
    </ThemeProvider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
