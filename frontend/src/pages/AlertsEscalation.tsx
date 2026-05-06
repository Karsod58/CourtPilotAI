import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { apiService, type Alert as AlertType } from "../services/apiService";

interface AlertItem {
  id: string;
  type: string;
  title: string;
  department: string;
  date: string;
  time: string;
  variant: 'urgent' | 'warning' | 'danger' | 'info';
  icon: JSX.Element;
  read: boolean;
  judgmentId: string;
}

const AlertsEscalation = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allRead, setAllRead] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'active'>('all');
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (filter === 'critical') {
        response = await apiService.getCriticalAlerts();
      } else if (filter === 'active') {
        response = await apiService.getActiveAlerts();
      } else {
        response = await apiService.getAllAlerts();
      }
      
      // Load statistics
      const stats = await apiService.getAlertStatistics();
      setStatistics(stats);
      
      // Transform backend alerts to display format
      const transformedAlerts: AlertItem[] = response.items.map((alert: AlertType) => {
        const alertDate = new Date(alert.created_at);
        
        // Determine variant based on severity
        let variant: 'urgent' | 'warning' | 'danger' | 'info' = 'info';
        if (alert.severity === 'critical') variant = 'danger';
        else if (alert.severity === 'high') variant = 'urgent';
        else if (alert.severity === 'medium') variant = 'warning';
        
        // Determine icon
        const icon = variant === 'info' ? <Info size={28} /> : <AlertTriangle size={28} />;
        
        // Determine type label
        let typeLabel = alert.type.toUpperCase().replace('_', ' ');
        if (alert.severity === 'critical') typeLabel = 'URGENT';
        else if (alert.type === 'deadline_missed') typeLabel = 'DEADLINE MISSED';
        
        return {
          id: alert.id,
          type: typeLabel,
          title: alert.title,
          department: alert.department || 'Unknown Department',
          date: alertDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          time: alertDate.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          variant,
          icon,
          read: alert.status === 'resolved' || alert.status === 'acknowledged',
          judgmentId: alert.judgment_id
        };
      });
      
      setAlerts(transformedAlerts);
    } catch (err) {
      console.error('Error loading alerts:', err);
      setError('Failed to load alerts');
      
      // Load fallback data
      loadFallbackAlerts();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackAlerts = () => {
    // Fallback static data
    const fallbackAlerts: AlertItem[] = [
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
        judgmentId: "1"
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
        judgmentId: "2"
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
        judgmentId: "3"
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
        judgmentId: "4"
      },
    ];
    
    setAlerts(fallbackAlerts);
  };

  const handleMarkAllAsRead = () => {
    setAllRead(true);
  };

  const handleViewCase = (judgmentId: string) => {
    navigate(`/cases/${judgmentId}`);
  };

  const handleViewAllAlerts = () => {
    setShowAllAlerts(!showAllAlerts);
  };

  // Display limited or all alerts
  const displayAlerts = showAllAlerts ? alerts : alerts.slice(0, 4);

  if (loading) {
    return (
      <AppLayout activeSidebarItem="alerts" pageTitle="Alerts & Escalation">
        <div className="loading-state" style={{ textAlign: 'center', padding: '4rem' }}>
          <Loader2 size={48} className="spin-icon" style={{ margin: '0 auto 1rem' }} />
          <p>Loading alerts...</p>
        </div>
      </AppLayout>
    );
  }

  if (error && alerts.length === 0) {
    return (
      <AppLayout activeSidebarItem="alerts" pageTitle="Alerts & Escalation">
        <div className="error-state" style={{ textAlign: 'center', padding: '4rem' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
          <h3>Error Loading Alerts</h3>
          <p>{error}</p>
          <button onClick={loadAlerts} style={{ marginTop: '1rem' }}>Retry</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeSidebarItem="alerts" pageTitle="Alerts & Escalation">
      <div className="alerts-card">
        <h2 className="alerts-title">ALERTS & ESCALATION</h2>

        {/* Filter buttons */}
        <div className="alerts-filters" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setFilter('all')}
            style={{
              padding: '0.5rem 1rem',
              background: filter === 'all' ? '#4f46e5' : '#e5e7eb',
              color: filter === 'all' ? 'white' : 'black',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            All Alerts
          </button>
          <button 
            onClick={() => setFilter('critical')}
            style={{
              padding: '0.5rem 1rem',
              background: filter === 'critical' ? '#ef4444' : '#e5e7eb',
              color: filter === 'critical' ? 'white' : 'black',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Critical
          </button>
          <button 
            onClick={() => setFilter('active')}
            style={{
              padding: '0.5rem 1rem',
              background: filter === 'active' ? '#f59e0b' : '#e5e7eb',
              color: filter === 'active' ? 'white' : 'black',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Active
          </button>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="alerts-stats" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '0.5rem', flex: 1 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                {statistics.by_severity?.critical || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>Critical</div>
            </div>
            <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', flex: 1 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>
                {statistics.by_severity?.high || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#92400e' }}>High</div>
            </div>
            <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '0.5rem', flex: 1 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                {statistics.by_severity?.medium || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>Medium</div>
            </div>
          </div>
        )}

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
          {displayAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <Info size={48} style={{ margin: '0 auto 1rem' }} />
              <p>No alerts found</p>
            </div>
          ) : (
            displayAlerts.map((alert) => (
              <div 
                className={`alert-item-card ${alert.variant} ${alert.read || allRead ? 'read' : ''}`} 
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
                  onClick={() => handleViewCase(alert.judgmentId)}
                >
                  View Case
                </button>
              </div>
            ))
          )}
        </div>

        {alerts.length > 4 && (
          <div className="view-all-wrapper">
            <button className="view-all-btn" onClick={handleViewAllAlerts}>
              {showAllAlerts ? 'Show Less' : `View All Alerts (${alerts.length})`}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AlertsEscalation;