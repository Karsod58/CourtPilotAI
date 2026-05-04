// File service for persisting data to JSON files
// This service handles reading and writing to JSON files in the data directory

import usersData from '../data/users.json';

export interface UserData {
  id: string;
  name: string;
  email: string;
  password: string;
  department: string;
  role: string;
  employeeId: string;
  avatar: string | null;
}

export interface UserWithoutPassword {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  employeeId: string;
  avatar: string | null;
}

class FileService {
  private users: UserData[] = [];

  constructor() {
    // Load initial users data
    this.users = [...usersData];
  }

  // Get all users
  getUsers(): UserData[] {
    return [...this.users];
  }

  // Get user by email
  getUserByEmail(email: string): UserData | null {
    return this.users.find(user => user.email === email) || null;
  }

  // Get user by employee ID
  getUserByEmployeeId(employeeId: string): UserData | null {
    return this.users.find(user => user.employeeId === employeeId) || null;
  }

  // Validate user credentials
  validateCredentials(email: string, password: string): UserWithoutPassword | null {
    const user = this.getUserByEmail(email);
    if (user && user.password === password) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  // Add new user and persist to file
  async addUser(userData: Omit<UserData, 'id'>): Promise<UserWithoutPassword> {
    // Check if user already exists
    const existingUser = this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const existingEmployeeId = this.getUserByEmployeeId(userData.employeeId);
    if (existingEmployeeId) {
      throw new Error('User with this employee ID already exists');
    }

    // Generate new ID
    const newId = this.users.length > 0 
      ? (Math.max(...this.users.map(u => parseInt(u.id))) + 1).toString()
      : '1';

    const newUser: UserData = {
      ...userData,
      id: newId,
    };

    // Add to memory
    this.users.push(newUser);

    // Persist to file (in a real app, this would be an API call)
    // For now, we'll use localStorage as a fallback for persistence
    try {
      localStorage.setItem('registeredUsers', JSON.stringify(this.users));
    } catch (error) {
      console.error('Failed to save users to localStorage:', error);
    }

    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  // Load users from localStorage (fallback persistence)
  loadUsersFromStorage(): void {
    try {
      const storedUsers = localStorage.getItem('registeredUsers');
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers) as UserData[];
        // Merge with initial users, avoiding duplicates
        const mergedUsers = [...this.users];
        
        parsedUsers.forEach(storedUser => {
          const exists = mergedUsers.find(u => u.email === storedUser.email);
          if (!exists) {
            mergedUsers.push(storedUser);
          }
        });
        
        this.users = mergedUsers;
      }
    } catch (error) {
      console.error('Failed to load users from localStorage:', error);
    }
  }

  // Get user count
  getUserCount(): number {
    return this.users.length;
  }

  // Check if any users exist
  hasUsers(): boolean {
    return this.users.length > 0;
  }
}

// Export singleton instance
export const fileService = new FileService();

// Initialize by loading any stored users
fileService.loadUsersFromStorage();
