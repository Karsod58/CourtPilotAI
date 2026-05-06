import { type User, type RegisterData } from "../contexts/AuthContext";
import { dataService } from "./dataService";

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

class AuthService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    // In production, this would be your actual backend URL
    this.baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
    this.token = localStorage.getItem("token");
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Request failed",
        errors: data.errors,
      };
    }

    return {
      success: true,
      data: data,
    };
  }

  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password }),
      });

      const result = await this.handleResponse<LoginResponse>(response);

      if (result.success && result.data) {
        // Store tokens
        localStorage.setItem("token", result.data.token);
        if (result.data.refreshToken) {
          localStorage.setItem("refreshToken", result.data.refreshToken);
        }
        this.token = result.data.token;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    }
  }

  async register(userData: RegisterData): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
      });

      const result = await this.handleResponse<LoginResponse>(response);

      if (result.success && result.data) {
        // Store tokens
        localStorage.setItem("token", result.data.token);
        if (result.data.refreshToken) {
          localStorage.setItem("refreshToken", result.data.refreshToken);
        }
        this.token = result.data.token;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred",
      };
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: "POST",
          headers: this.getHeaders(),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear tokens regardless of API call success
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      this.token = null;
    }
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        this.token = data.token;
        return true;
      }
    } catch (error) {
      console.error("Token refresh error:", error);
    }

    return false;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${this.baseURL}/auth/me`, {
        headers: this.getHeaders(),
      });

      return this.handleResponse<User>(response);
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch user data",
      };
    }
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${this.baseURL}/auth/profile`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
      });

      return this.handleResponse<User>(response);
    } catch (error) {
      return {
        success: false,
        message: "Failed to update profile",
      };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/auth/change-password`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      return this.handleResponse<void>(response);
    } catch (error) {
      return {
        success: false,
        message: "Failed to change password",
      };
    }
  }

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/auth/forgot-password`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ email }),
      });

      return this.handleResponse<void>(response);
    } catch (error) {
      return {
        success: false,
        message: "Failed to send password reset email",
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/auth/reset-password`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ token, newPassword }),
      });

      return this.handleResponse<void>(response);
    } catch (error) {
      return {
        success: false,
        message: "Failed to reset password",
      };
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  
  validateCredentials(email: string, password: string): User | null {
    return dataService.validateCredentials(email, password) || null;
  }
}

// Export singleton instance
export const authService = new AuthService();
