import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Filter,
  Clock,
  Target,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { apiService } from "../services/apiService";

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [rejectedDirectives, setRejectedDirectives] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [dashboard, compliance, departments] = await Promise.all([
        apiService.getDashboardAnalytics(),
        apiService.getComplianceMetrics(),
        apiService.getDepartmentPerformance()
      ]);
      
      setDashboardData(dashboard);
      setComplianceData(compliance);
      
      // Transform department data for charts
      const deptChartData = Object.entries(departments.by_department || {}).map(([name, count]) => ({
        name,
        value: count as number,
        cases: count as number
      }));
      setDepartmentData(deptChartData);
      
      // Load rejected directives
      await loadRejectedDirectives();
      
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadRejectedDirectives = async () => {
    try {
      // Get all pending directives first, then filter for rejected
      const response = await apiService.getPendingDirectives();
      // Filter for rejected status (verification_status = 'rejected')
      const rejected = response.items.filter(
        (d: any) => d.verification_status === 'rejected'
      );
      setRejectedDirectives(rejected.slice(0, 10)); // Show top 10
    } catch (err) {
      console.error('Error loading rejected directives:', err);
      // Fallback: try getting all judgments and their directives
      try {
        const judgments = await apiService.getJudgments(1, 20);
        const allRejected: any[] = [];
        
        for (const judgment of judgments.items) {
          try {
            const directives = await apiService.getJudgmentDirectives(judgment.id);
            const rejected = directives.items.filter(
              (d: any) => d.verification_status === 'rejected'
            );
            allRejected.push(...rejected);
          } catch (e) {
            // Skip this judgment
          }
        }
        
        setRejectedDirectives(allRejected.slice(0, 10));
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
        setRejectedDirectives([]);
      }
    }
  };

  // Prepare status distribution data
  const statusData = dashboardData ? [
    { name: "Uploaded", value: dashboardData.total_judgments || 0, color: "#1f6feb" },
    { name: "Processing", value: dashboardData.processing || 0, color: "#ff7a18" },
    { name: "Pending Verification", value: dashboardData.pending_verification || 0, color: "#ffc107" },
    { name: "Completed", value: dashboardData.completed || 0, color: "#36c994" },
  ] : [];

  // Mock monthly trend data (backend doesn't provide this yet)
  const monthlyTrend = [
    { month: "Jan", cases: 120, completed: 95 },
    { month: "Feb", cases: 145, completed: 118 },
    { month: "Mar", cases: 168, completed: 142 },
    { month: "Apr", cases: 192, completed: 165 },
    { month: "May", cases: 215, completed: 188 },
    { month: "Jun", cases: 234, completed: 205 },
  ];

  // Mock risk distribution (backend doesn't provide this yet)
  const riskDistribution = [
    { risk: "High", count: 45, percentage: 25 },
    { risk: "Medium", count: 78, percentage: 43 },
    { risk: "Low", count: 57, percentage: 32 }
  ];
  return (
    <AppLayout activeSidebarItem="analytics" pageTitle="Analytics Dashboard">
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <AlertTriangle size={48} />
          <h3>Error Loading Analytics</h3>
          <p>{error}</p>
          <button onClick={loadAnalytics}>Retry</button>
        </div>
      ) : (
        <>
      <div className="analytics-header">
        <div className="analytics-period">
          <button className="period-btn active">Last 6 Months</button>
          <button className="period-btn">Last Year</button>
          <button className="period-btn">All Time</button>
        </div>

        <div className="analytics-actions">
          <button className="action-btn">
            <Calendar size={16} />
            Custom Range
          </button>
          <button className="action-btn">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      <div className="analytics-overview">
        <div className="overview-card">
          <div className="overview-header">
            <span>Total Cases Processed</span>
            <TrendingUp size={16} className="trend-up" />
          </div>
          <div className="overview-value">
            <h2>{dashboardData?.total_judgments || 0}</h2>
            <span className="positive">+12.5%</span>
          </div>
          <p>vs previous period</p>
        </div>

        <div className="overview-card">
          <div className="overview-header">
            <span>Pending Verification</span>
            <TrendingDown size={16} className="trend-down" />
          </div>
          <div className="overview-value">
            <h2>{dashboardData?.pending_verification || 0}</h2>
            <span className="neutral">Awaiting review</span>
          </div>
          <p>directives to verify</p>
        </div>

        <div className="overview-card">
          <div className="overview-header">
            <span>Compliance Rate</span>
            <TrendingUp size={16} className="trend-up" />
          </div>
          <div className="overview-value">
            <h2>{complianceData?.compliance_rate || 87}%</h2>
            <span className="positive">+5.2%</span>
          </div>
          <p>of deadlines met</p>
        </div>

        <div className="overview-card">
          <div className="overview-header">
            <span>Processing</span>
            <AlertTriangle size={16} className="trend-neutral" />
          </div>
          <div className="overview-value">
            <h2>{dashboardData?.processing || 0}</h2>
            <span className="neutral">In progress</span>
          </div>
          <p>currently processing</p>
        </div>
      </div>

      <div className="analytics-charts">
        <div className="chart-row">
          <div className="chart-card">
            <h3>Cases by Department</h3>
            <div className="chart-content">
              {departmentData.length > 0 ? (
                <>
              <ResponsiveContainer width={200} height={200}>
                <RechartsPieChart>
                  <Pie
                    data={departmentData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {departmentData.map((_, index) => (
                      <Cell key={index} fill={["#ff7a18", "#1f6feb", "#36c994", "#2bc7d3", "#7c3aed"][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {departmentData.map((item, index) => (
                  <div key={item.name} className="legend-item">
                    <span style={{ background: ["#ff7a18", "#1f6feb", "#36c994", "#2bc7d3", "#7c3aed"][index % 5] }} />
                    <div>
                      <span>{item.name}</span>
                      <b>{item.cases} cases</b>
                    </div>
                  </div>
                ))}
              </div>
              </>
              ) : (
                <p>No department data available</p>
              )}
            </div>
          </div>

          <div className="chart-card">
            <h3>Case Status Distribution</h3>
            <div className="chart-content">
              {statusData.length > 0 && statusData.some(s => s.value > 0) ? (
                <>
              <ResponsiveContainer width={200} height={200}>
                <RechartsPieChart>
                  <Pie
                    data={statusData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {statusData.map((item) => (
                  <div key={item.name} className="legend-item">
                    <span style={{ background: item.color }} />
                    <div>
                      <span>{item.name}</span>
                      <b>{item.value} cases</b>
                    </div>
                  </div>
                ))}
              </div>
              </>
              ) : (
                <p>No status data available</p>
              )}
            </div>
          </div>
        </div>

        <div className="chart-card full-width">
          <h3>Monthly Case Trends</h3>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cases" stroke="#1f6feb" strokeWidth={2} />
                <Line type="monotone" dataKey="completed" stroke="#36c994" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-row">
          <div className="chart-card">
            <h3>Risk Distribution</h3>
            <div className="risk-bars">
              {riskDistribution.map((risk) => (
                <div key={risk.risk} className="risk-bar">
                  <div className="risk-info">
                    <span>{risk.risk}</span>
                    <b>{risk.count}</b>
                  </div>
                  <div className="risk-progress">
                    <div 
                      className={`risk-fill ${risk.risk.toLowerCase()}`}
                      style={{ width: `${risk.percentage}%` }}
                    />
                    <span>{risk.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h3>Key Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-item">
                <div className="metric-icon">
                  <Target size={20} />
                </div>
                <div>
                  <span>Success Rate</span>
                  <b>92.3%</b>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon">
                  <Clock size={20} />
                </div>
                <div>
                  <span>Avg Resolution</span>
                  <b>4.8 days</b>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <span>Escalations</span>
                  <b>23</b>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <span>Productivity</span>
                  <b>+15.2%</b>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rejected Directives Section */}
        <div className="chart-card full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Rejected Directives ({rejectedDirectives.length})</h3>
            <span style={{ fontSize: '14px', color: '#dc2626' }}>
              <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Requires Review
            </span>
          </div>
          <div className="chart-content">
            {rejectedDirectives.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                No rejected directives found
              </p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="cases-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Directive</th>
                      <th>Judgment ID</th>
                      <th>Priority</th>
                      <th>Rejected By</th>
                      <th>Date</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejectedDirectives.map((directive) => (
                      <tr key={directive.id}>
                        <td style={{ maxWidth: '300px' }}>
                          {directive.directive_text.substring(0, 100)}...
                        </td>
                        <td>{directive.judgment_id}</td>
                        <td>
                          <span className={`status-badge ${directive.priority.toLowerCase()}`}>
                            {directive.priority}
                          </span>
                        </td>
                        <td>{directive.verified_by || 'System'}</td>
                        <td>
                          {directive.verified_at 
                            ? new Date(directive.verified_at).toLocaleDateString('en-IN')
                            : 'N/A'
                          }
                        </td>
                        <td style={{ maxWidth: '200px', fontSize: '13px', color: '#6b7280' }}>
                          {directive.verification_notes || 'No reason provided'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </AppLayout>
  );
};

export default Analytics;
