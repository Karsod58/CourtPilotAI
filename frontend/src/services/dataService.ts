import usersData from '../data/users.json';
import casesData from '../data/cases.json';
import alertsData from '../data/alerts.json';
import analyticsData from '../data/analytics.json';
import settingsData from '../data/settings.json';
import chatMessagesData from '../data/chatMessages.json';
import lifecycleData from '../data/lifecycle.json';
import notificationsData from '../data/notifications.json';

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

class DataService {
  private users: UserData[] = usersData as UserData[];

  // User operations
  getUsers(): UserData[] {
    return this.users;
  }

  getUserByEmail(email: string): UserData | null {
    return this.users.find(user => user.email === email) || null;
  }

  getUserById(id: string): UserData | null {
    return this.users.find(user => user.id === id) || null;
  }

  getUserByEmployeeId(employeeId: string): UserData | null {
    return this.users.find(user => user.employeeId === employeeId) || null;
  }

  validateCredentials(email: string, password: string): UserWithoutPassword | null {
    const user = this.getUserByEmail(email);
    if (user && user.password === password) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  addUser(userData: Omit<UserData, 'id'>): UserWithoutPassword {
    const newUser: UserData = {
      ...userData,
      id: (this.users.length + 1).toString(),
    };
    this.users.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  // Mock data for other components
  getDashboardStats() {
    return {
      totalCases: 156,
      pendingVerification: 23,
      complianceIssues: 8,
      urgentDeadlines: 5,
      monthlyTrends: [
        { month: 'Jan', cases: 12 },
        { month: 'Feb', cases: 18 },
        { month: 'Mar', cases: 24 },
        { month: 'Apr', cases: 20 },
        { month: 'May', cases: 28 },
        { month: 'Jun', cases: 32 },
      ],
      statusDistribution: [
        { name: 'Completed', value: 89, color: '#10b981' },
        { name: 'In Progress', value: 34, color: '#3b82f6' },
        { name: 'Pending', value: 23, color: '#f59e0b' },
        { name: 'Overdue', value: 10, color: '#ef4444' },
      ],
      riskAssessment: [
        { risk: 'High', count: 8, color: '#ef4444' },
        { risk: 'Medium', count: 15, color: '#f59e0b' },
        { risk: 'Low', count: 25, color: '#10b981' },
      ],
    };
  }

  getCasesData() {
    return casesData;
  }

  getAlertsData() {
    return alertsData;
  }

  getAnalyticsData() {
    return analyticsData;
  }

  getSettingsData() {
    return settingsData;
  }

  getChatMessagesData() {
    return chatMessagesData;
  }

  getLifecycleData() {
    return lifecycleData;
  }

  getNotificationsData() {
    return notificationsData;
  }
}

// Export singleton instance
export const dataService = new DataService();
