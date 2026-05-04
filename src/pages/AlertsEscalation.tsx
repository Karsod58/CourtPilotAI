import { AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";

const alerts = [
  {
    id: "HC/2024/1234",
    type: "URGENT",
    title: "Case HC/2024/1234 - Deadline in 2 days",
    department: "Finance Department",
    date: "10 Apr 2024",
    time: "10:30 AM",
    variant: "urgent",
    icon: <AlertTriangle size={28} />,
    read: false,
  },
  {
    id: "HC/2024/0987",
    type: "WARNING",
    title: "Case HC/2024/0987 - No progress from department",
    department: "Home Department",
    date: "10 Apr 2024",
    time: "09:45 AM",
    variant: "warning",
    icon: <AlertTriangle size={28} />,
    read: false,
  },
  {
    id: "HC/2024/0567",
    type: "DEADLINE MISSED",
    title: "Case HC/2024/0567 - Deadline missed by 3 days",
    department: "PWD",
    date: "10 Apr 2024",
    time: "09:15 AM",
    variant: "danger",
    icon: <AlertTriangle size={28} />,
    read: false,
  },
  {
    id: "HC/2024/1456",
    type: "INFO",
    title: "New judgment uploaded in HC/2024/1456",
    department: "Education Department",
    date: "10 Apr 2024",
    time: "08:30 AM",
    variant: "info",
    icon: <Info size={28} />,
    read: false,
  },
];

const AlertsEscalation = () => {
  const navigate = useNavigate();
  const [allRead, setAllRead] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const handleMarkAllAsRead = () => {
    setAllRead(true);
  };

  const handleViewCase = (caseId: string) => {
    navigate(`/cases/:${caseId}`);
  };

  const handleViewAllAlerts = () => {
    // Toggle to show all alerts instead of just 4
    setShowAllAlerts(true);
  };

  // All alerts data (expanded from the current 4)
  const allAlertsData = [
    ...alerts,
    {
      id: "HC/2024/2345",
      type: "WARNING",
      title: "Case HC/2024/2345 - Document submission pending",
      department: "Legal Department",
      date: "10 Apr 2024",
      time: "11:15 AM",
      variant: "warning",
      icon: <AlertTriangle size={28} />,
      read: false,
    },
    {
      id: "HC/2024/3456",
      type: "INFO",
      title: "Case HC/2024/3456 - Hearing scheduled",
      department: "Judicial Department",
      date: "10 Apr 2024",
      time: "02:30 PM",
      variant: "info",
      icon: <Info size={28} />,
      read: false,
    },
    {
      id: "HC/2024/4567",
      type: "URGENT",
      title: "Case HC/2024/4567 - Compliance deadline approaching",
      department: "Compliance Department",
      date: "10 Apr 2024",
      time: "04:00 PM",
      variant: "urgent",
      icon: <AlertTriangle size={28} />,
      read: false,
    },
    {
      id: "HC/2024/5678",
      type: "WARNING",
      title: "Case HC/2024/5678 - Budget approval required",
      department: "Finance Department",
      date: "10 Apr 2024",
      time: "03:45 PM",
      variant: "warning",
      icon: <AlertTriangle size={28} />,
      read: false,
    },
  ];

  // Use all alerts when "View All" is clicked, otherwise show limited alerts
  const displayAlerts = showAllAlerts ? allAlertsData : alerts;

  return (
    <AppLayout activeSidebarItem="alerts" pageTitle="Alerts & Escalation">
      <div className="alerts-card">
        <h2 className="alerts-title">ALERTS & ESCALATION</h2>

        <div className="alerts-header">
          <h3>Alerts</h3>
          <button 
            className="mark-read-btn" 
            onClick={handleMarkAllAsRead}
            disabled={allRead}
          >
            {allRead ? 'All Read' : 'Mark all as read'}
          </button>
        </div>

        <div className="alerts-list">
          {displayAlerts.map((alert) => (
            <div 
              className={`alert-item-card ${alert.variant} ${alert.read ? 'read' : ''}`} 
              key={alert.id}
            >
              <div className={`alert-icon ${alert.variant}`}>{alert.icon}</div>

              <div className="alert-content">
                <p className={`alert-type ${alert.variant}`}>{alert.type}</p>
                <h4>{alert.title}</h4>
                <p className="alert-department">Department: {alert.department}</p>
              </div>

              <div className="alert-time">
                <p>{alert.date}</p>
                <p>{alert.time}</p>
              </div>

              <button 
                className="view-case-btn" 
                onClick={() => handleViewCase(alert.id)}
              >
                View Case
              </button>
            </div>
          ))}
        </div>

        <div className="view-all-wrapper">
          <button className="view-all-btn" onClick={handleViewAllAlerts}>
            {showAllAlerts ? 'Show Less' : 'View All Alerts'} ({showAllAlerts ? displayAlerts.length : alerts.length})
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default AlertsEscalation;