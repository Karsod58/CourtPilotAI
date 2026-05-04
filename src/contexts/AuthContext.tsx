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
      // In production, this would be an actual API call
      const response = await fetch("/api/auth/login", {
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
        setError(errorData.message || "Login failed");
        return false;
      }
    } catch (error) {
      // For demo purposes, use fileService for authentication with persistent storage
      console.error("Login error:", error);
      
      const user = fileService.validateCredentials(email, password);
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("token", "mock-jwt-token");
        
        setUser(user);
        return true;
      } else {
        setError("Invalid email or password");
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // In production, this would be an actual API call
      const response = await fetch("/api/auth/register", {
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
        setError(errorData.message || "Registration failed");
        return false;
      }
    } catch (error) {
      // For demo purposes, use fileService for registration with persistent storage
      console.error("Registration error:", error);
      
      try {
        // Add new user to the file service (this will persist the user)
        const newUser = {
          ...userData,
          avatar: null,
        };
        
        await fileService.addUser(newUser);
        return true;
      } catch (regError) {
        const errorMessage = regError instanceof Error ? regError.message : "Registration failed";
        setError(errorMessage);
        return false;
      }
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
