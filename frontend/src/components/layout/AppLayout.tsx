import type { ReactNode } from "react";
import { useState } from "react";
import AppSidebar from "./AppSidebar";
import AppTopBar from "./AppTopBar";
import "./AppLayout.css";

interface AppLayoutProps {
  children: ReactNode;
  activeSidebarItem?: string;
  showUserCard?: boolean;
  showUpload?: boolean;
  showSearch?: boolean;
  notificationCount?: number;
  pageTitle?: string;
}

const AppLayout = ({
  children,
  activeSidebarItem = "dashboard",
  showUserCard = true,
  showUpload = true,
  showSearch = true,
  notificationCount = 12,
  pageTitle
}: AppLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="court-dashboard">
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle" 
        onClick={toggleMobileMenu}
        aria-label="Toggle mobile menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <AppSidebar 
        activeItem={activeSidebarItem} 
        showUserCard={showUserCard} 
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="dashboard-main">
        <section className="dashboard-card">
          <AppTopBar 
            showUpload={showUpload}
            showSearch={showSearch}
            notificationCount={notificationCount}
            onMobileMenuToggle={toggleMobileMenu}
          />
          {pageTitle && <h1 className="page-title">{pageTitle}</h1>}
          {children}
        </section>
      </main>
    </div>
  );
};

export default AppLayout;
