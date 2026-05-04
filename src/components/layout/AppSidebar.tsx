import { useNavigate } from "react-router-dom";
import {
  Bell,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface AppSidebarProps {
  activeItem?: string;
  showUserCard?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const AppSidebar = ({ activeItem = "dashboard", showUserCard = true, isMobileOpen, onMobileClose }: AppSidebarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
    onMobileClose?.();
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    onMobileClose?.();
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { id: "upload", label: "Upload Judgment", icon: Upload, path: "/upload" },
    { id: "processing", label: "AI Processing", icon: Sparkles, path: "/processing" },
    { id: "verified-actions", label: "Verification", icon: CheckCircle2, path: "/verification" },
    { id: "action-plan", label: "Action Plan", icon: Target, path: "/action-plan" },
    { id: "lifecycle", label: "Lifecycle", icon: Clock3, path: "/lifecycle" },
    { id: "cases", label: "Cases", icon: FileText, path: "/cases" },
    { id: "alerts", label: "Alerts", icon: Bell, path: "/alerts" },
    { id: "analytics", label: "Analytics", icon: BarChart3, path: "/analytics" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand">
        <div className="brand-icon">
          <ShieldCheck size={26} />
        </div>
        <div>
          <h2>CourtPilot AI</h2>
          <p>Judgment to Action</p>
        </div>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeItem === item.id ? "active" : ""}`}
            onClick={() => handleNavClick(item.path)}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
        
        <button className="nav-item" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </nav>

      {showUserCard && user && (
        <div className="user-card">
          <div className="avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4>{user.name}</h4>
            <p>{user.role}</p>
            <span className="user-department">{user.department}</span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
