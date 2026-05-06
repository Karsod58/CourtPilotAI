import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { dataService } from '../services/dataService';
import { fileService } from '../services/fileService';

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  employeeId: string;
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  department: string;
  role: string;
  employeeId: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the backend API
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const userData: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          department: data.user.department,
          role: data.user.role,
          employeeId: data.user.employeeId,
          avatar: data.user.avatar,
        };

        // Store user data and token
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", data.token);
        
        setUser(userData);
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.detail || errorData.message || "Login failed");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Unable to connect to server. Please check if the backend is running.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the backend API
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        // Registration successful - but don't auto-login
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.detail || errorData.message || "Registration failed");
        return false;
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("Unable to connect to server. Please check if the backend is running.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setError(null);
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
