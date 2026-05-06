import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Bell, Search, Upload, Menu } from "lucide-react";
import NotificationDropdown from "../NotificationDropdown";
import SearchDropdown from "../SearchDropdown";

interface AppTopBarProps {
  showUpload?: boolean;
  showSearch?: boolean;
  notificationCount?: number;
  onMobileMenuToggle?: () => void;
}

const AppTopBar = ({ 
  showUpload = true, 
  showSearch = true, 
  notificationCount = 12,
  onMobileMenuToggle 
}: AppTopBarProps) => {
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleNotifications = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setIsSearchOpen(false); // Close search when opening notifications
  };

  const closeNotifications = () => {
    setIsNotificationOpen(false);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    setIsNotificationOpen(false); // Close notifications when opening search
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  return (
    <div className="topbar">
      {/* Mobile Menu Toggle */}
      <button className="mobile-menu-toggle-top" onClick={onMobileMenuToggle}>
        <Menu size={20} />
      </button>
      
      {showSearch && (
        <div className="search-wrapper">
          <div className="search-box" onClick={toggleSearch}>
            <Search size={16} />
            <input 
              placeholder="Search cases, departments, parties..." 
              readOnly
              onClick={toggleSearch}
            />
          </div>
          <SearchDropdown 
            isOpen={isSearchOpen} 
            onClose={closeSearch} 
          />
        </div>
      )}

      <div className="top-actions">
        <div className="notification-wrapper">
          <button 
            className="icon-btn notification" 
            onClick={toggleNotifications}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {notificationCount > 0 && <span>{notificationCount}</span>}
          </button>
          <NotificationDropdown 
            isOpen={isNotificationOpen} 
            onClose={closeNotifications} 
            notificationCount={notificationCount}
          />
        </div>

        {showUpload && (
          <button className="upload-btn" onClick={() => navigate("/upload")}>
            <Upload size={16} />
            Upload Judgment
          </button>
        )}
      </div>
    </div>
  );
};

export default AppTopBar;
