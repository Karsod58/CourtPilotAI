import {
  User,
  Bell,
  Shield,
  Database,
  HelpCircle,
  LogOut,
  Save,
  Mail,
  Phone,
  Building,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { dataService } from "../services/dataService";
import { fileService } from "../services/fileService";
import { useAuth } from "../contexts/AuthContext";

const Settings = () => {
  const { user: currentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const settingsData = dataService.getSettingsData();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Load all users on component mount
  useEffect(() => {
    const loadUsers = () => {
      try {
        const users = fileService.getUsers();
        setAllUsers(users);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  // Update profile state when current user changes
  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: '',
        department: currentUser.department || '',
        role: currentUser.role || '',
        employeeId: currentUser.employeeId || '',
      });
    }
  }, [currentUser]);
  
  const [notifications, setNotifications] = useState({
    emailNotifications: settingsData.notifications.emailNotifications,
    pushNotifications: settingsData.notifications.pushNotifications,
    deadlineAlerts: settingsData.notifications.deadlineAlerts,
    weeklyReports: settingsData.notifications.weeklyReports,
    systemUpdates: settingsData.notifications.systemUpdates,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: settingsData.privacy.profileVisibility,
    showEmail: settingsData.privacy.showEmail,
    showPhone: settingsData.privacy.showPhone,
    dataSharing: settingsData.privacy.dataSharing,
    twoFactorAuth: settingsData.system.twoFactorAuth,
  });

  const [profile, setProfile] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
    department: currentUser?.department || '',
    role: currentUser?.role || '',
    employeeId: currentUser?.employeeId || '',
  });

  const handleNotificationToggle = (key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof notifications]
    }));
  };

  const handlePrivacyToggle = (key: string) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof privacy]
    }));
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <AppLayout activeSidebarItem="settings" pageTitle="Settings">
      <div className="settings-container">
        <div className="settings-sections">
          {/* Profile Section */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <User size={20} />
              </div>
              <div>
                <h3>Profile Information</h3>
                <p>Update your personal and professional details</p>
              </div>
            </div>

            <div className="settings-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={profile.department}
                    onChange={(e) => handleProfileChange('department', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => handleProfileChange('role', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    value={profile.employeeId}
                    onChange={(e) => handleProfileChange('employeeId', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Change Password</label>
                <div className="password-input">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <Bell size={20} />
              </div>
              <div>
                <h3>Notification Preferences</h3>
                <p>Control how and when you receive notifications</p>
              </div>
            </div>

            <div className="settings-toggles">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <span className="toggle-description">
                      {key === 'emailAlerts' && 'Receive email notifications for important updates'}
                      {key === 'pushNotifications' && 'Get push notifications in your browser'}
                      {key === 'deadlineReminders' && 'Remind me before case deadlines'}
                      {key === 'weeklyReports' && 'Send weekly summary reports'}
                      {key === 'systemUpdates' && 'Notify about system maintenance and updates'}
                    </span>
                  </div>
                  <button
                    className={`toggle-button ${value ? 'active' : ''}`}
                    onClick={() => handleNotificationToggle(key)}
                  >
                    {value ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy & Security Section */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <Shield size={20} />
              </div>
              <div>
                <h3>Privacy & Security</h3>
                <p>Manage your privacy settings and security preferences</p>
              </div>
            </div>

            <div className="settings-toggles">
              {Object.entries(privacy).map(([key, value]) => (
                <div key={key} className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <span className="toggle-description">
                      {key === 'shareAnalytics' && 'Share anonymous usage data to improve the service'}
                      {key === 'publicProfile' && 'Make your profile visible to other government departments'}
                      {key === 'twoFactorAuth' && 'Enable two-factor authentication for enhanced security'}
                      {key === 'sessionTimeout' && 'Automatically log out after period of inactivity'}
                    </span>
                  </div>
                  <button
                    className={`toggle-button ${value ? 'active' : ''}`}
                    onClick={() => handlePrivacyToggle(key)}
                  >
                    {value ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User Management Section */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <User size={20} />
              </div>
              <div>
                <h3>User Management</h3>
                <p>View all registered users and their login information</p>
              </div>
            </div>

            <div className="user-management-content">
              {isLoadingUsers ? (
                <div className="loading-users">
                  <div className="loading-spinner"></div>
                  <span>Loading users...</span>
                </div>
              ) : (
                <>
                  <div className="users-summary">
                    <div className="summary-card">
                      <div className="summary-number">{allUsers.length}</div>
                      <div className="summary-label">Total Users</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-number">
                        {allUsers.filter(u => u.department).length}
                      </div>
                      <div className="summary-label">With Departments</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-number">
                        {allUsers.filter(u => u.employeeId).length}
                      </div>
                      <div className="summary-label">With Employee IDs</div>
                    </div>
                  </div>

                  <div className="users-table-container">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Department</th>
                          <th>Role</th>
                          <th>Employee ID</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((user) => (
                          <tr 
                            key={user.id} 
                            className={`user-row ${currentUser?.id === user.id ? 'current-user' : ''}`}
                          >
                            <td className="user-id">{user.id}</td>
                            <td className="user-name">
                              <div className="user-info">
                                <div className="user-avatar">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="name">{user.name}</div>
                                  {currentUser?.id === user.id && (
                                    <div className="current-user-badge">You</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="user-email">{user.email}</td>
                            <td className="user-department">{user.department || 'Not Assigned'}</td>
                            <td className="user-role">{user.role || 'Not Assigned'}</td>
                            <td className="user-employee-id">{user.employeeId || 'Not Assigned'}</td>
                            <td className="user-status">
                              <span className="status-badge registered">Registered</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {allUsers.length === 0 && (
                      <div className="no-users">
                        <User size={48} className="text-gray-300" />
                        <h3>No Users Found</h3>
                        <p>No users have registered yet. Once users register, they will appear here.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* System Settings */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon">
                <Database size={20} />
              </div>
              <div>
                <h3>System Settings</h3>
                <p>Configure system-level preferences and data management</p>
              </div>
            </div>

            <div className="settings-actions">
              <button className="settings-action-btn">
                <Database size={16} />
                Export Data
              </button>
              <button className="settings-action-btn">
                <Database size={16} />
                Import Data
              </button>
              <button className="settings-action-btn">
                <HelpCircle size={16} />
                System Logs
              </button>
              <button className="settings-action-btn danger">
                <Database size={16} />
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        {/* Save Section */}
        <div className="settings-footer">
          <div className="save-actions">
            <button className="save-btn primary">
              <Save size={16} />
              Save Changes
            </button>
            <button className="save-btn secondary">
              Cancel
            </button>
          </div>

          <div className="danger-zone">
            <h4>Danger Zone</h4>
            <p>Irreversible actions that affect your account</p>
            <button className="danger-btn">
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
