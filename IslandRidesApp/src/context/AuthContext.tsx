import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { User, LoginRequest, RegisterRequest, ProfileData } from '../types';

interface AuthContextType {
  // State
  isAuthenticated: boolean;
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthenticationStatus();
  }, []);

  const checkAuthenticationStatus = async () => {
    console.log('🔍 AuthContext: Checking authentication status...');
    
    try {
      setIsLoading(true);
      setError(null);
      
      const token = await apiService.getToken();
      console.log('🔍 AuthContext: Token exists:', !!token);
      
      if (token) {
        // Token exists, assume user is authenticated for now
        // The token will be validated when a protected resource is requested
        setIsAuthenticated(true);
        console.log('✅ AuthContext: Token found, assuming user is authenticated.');
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('❌ AuthContext: Auth check error:', error);
      setError(error instanceof Error ? error.message : 'Authentication check failed');
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
      console.log('🔍 AuthContext: Auth check complete');
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    console.log('🔐 AuthContext: Login attempt for:', email);
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.login({ email, password });
      
      setCurrentUser(response.user);
      setIsAuthenticated(true);
      
      console.log('✅ AuthContext: Login successful for:', response.user.email);
    } catch (error) {
      console.error('❌ AuthContext: Login failed:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
      setIsAuthenticated(false);
      setCurrentUser(null);
      throw error; // Re-throw so UI can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    role: string = 'customer'
  ): Promise<void> => {
    console.log('📝 AuthContext: Registration attempt for:', email);
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.register({ email, password, firstName, lastName, role });
      
      setCurrentUser(response.user);
      setIsAuthenticated(true);
      
      console.log('✅ AuthContext: Registration successful for:', response.user.email);
    } catch (error) {
      console.error('❌ AuthContext: Registration failed:', error);
      setError(error instanceof Error ? error.message : 'Registration failed');
      setIsAuthenticated(false);
      setCurrentUser(null);
      throw error; // Re-throw so UI can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🚪 AuthContext: Logout initiated');
    
    try {
      setIsLoading(true);
      setError(null);
      
      await authService.logout();
      
      setIsAuthenticated(false);
      setCurrentUser(null);
      
      console.log('✅ AuthContext: Logout successful');
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
      // Even if logout fails on server, clear local state
      setIsAuthenticated(false);
      setCurrentUser(null);
      setError(error instanceof Error ? error.message : 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const refreshUser = async (): Promise<void> => {
    console.log('🔄 AuthContext: Refreshing user data...');
    
    try {
      if (!isAuthenticated) {
        throw new Error('Not authenticated');
      }
      
      const profileData = await apiService.get<ProfileData>('/api/users/me/profile');
      setCurrentUser(profileData.user);
      
      console.log('✅ AuthContext: User data refreshed');
    } catch (error) {
      console.error('❌ AuthContext: Failed to refresh user:', error);
      // If refresh fails, might be due to expired token
      await logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    // State
    isAuthenticated,
    currentUser,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
