import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { loginUser, registerUser } from '@/lib/api';
import { STORAGE_KEYS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await loginUser(email, password);
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
        toast({
          title: "Welcome back!",
          description: "You've been successfully logged in.",
        });
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const response = await registerUser(email, password, fullName);
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
        toast({
          title: "Account created!",
          description: "Welcome to Hire Mate. Let's get you set up.",
        });
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_PROGRESS);
    toast({
      title: "Logged out",
      description: "You've been successfully logged out.",
    });
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};