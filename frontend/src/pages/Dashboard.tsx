import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { apiService } from "../services/apiService";

const colors = ["#ff7a18", "#1f6feb", "#36c994", "#2bc7d3", "#7c3aed"];

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log("Fetching dashboard data...");
        const data = await apiService.getDashboardAnalytics();
        console.log("Dashboard data received:", data);
        setDashboardData(data);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        // Set default data if API fails
        setDashboardData({
          total_judgments: 0,
          total_directives: 0,
          pending_verification: 0,
          overdue_actions: 0,
          status_distribution: {},
          priority_distribution: {},
          summary: {
            completed_cases: 0,
            active_cases: 0,
            high_priority_directives: 0
          }
        });
        setError(null); // Don't show error, just use default data
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleViewAllDeadlines = () => {
    navigate('/deadlines');
  };

  // Prepare status distribution data for chart
  const statusData = dashboardData?.status_distribution
    ? Object.entries(dashboardData.status_distribution).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
        value: value as number
      }))
    : [];

  // Prepare priority distribution data
  const priorityData = dashboardData?.priority_distribution
    ? Object.entries(dashboardData.priority_distribution).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: value as number
      }))
    : [];

  // Placeholder for department data (will be replaced with real data later)
  const departmentData = [
    { name: "Legal Dept.", value: 29 },
    { name: "Finance Dept.", value: 25 },
    { name: "PWD", value: 18 },
  ];

  // Placeholder for deadlines (will be replaced with real data later)
  const deadlines = [
    {
      id: "WP-001",
      title: "Sample Case 1",
      department: "Legal",
      deadline: "15 May",
      daysLeft: "10 days",
      priority: "High"
    },
    {
      id: "WP-002",
      title: "Sample Case 2",
      department: "Finance",
      deadline: "20 May",
      daysLeft: "15 days",
      priority: "Medium"
    },
    {
      id: "WP-003",
      title: "Sample Case 3",
      department: "PWD",
      deadline: "25 May",
      daysLeft: "20 days",
      priority: "Low"
    }
  ];

  if (loading && !dashboardData) {
    return (
      <AppLayout activeSidebarItem="dashboard" pageTitle="Overview">
        <div className="summary-grid">
          <div className="metric-card">
            <p>Loading...</p>
            <h2>--</h2>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeSidebarItem="dashboard" pageTitle="Overview">

          <div className="summary-grid">
            <div className="metric-card">
              <p>Total Judgments</p>
              <h2>{dashboardData?.total_judgments || 0}</h2>
              <span className="blue-text">All time</span>
              <div className="metric-icon blue">
                <FileText size={18} />
              </div>
            </div>

            <div className="metric-card">
              <p>Pending Verification</p>
              <h2>{dashboardData?.pending_verification || 0}</h2>
              <span className="orange-text">Needs attention</span>
              <div className="metric-icon orange">
                <AlertCircle size={18} />
              </div>
            </div>

            <div className="metric-card">
              <p>Overdue Actions</p>
              <h2>{dashboardData?.overdue_actions || 0}</h2>
              <span className="red-text">High priority</span>
              <div className="metric-icon red">
                <AlertCircle size={18} />
              </div>
            </div>

            <div className="metric-card">
              <p>Completed</p>
              <h2>{dashboardData?.summary?.completed_cases || 0}</h2>
              <span className="green-text">Successfully closed</span>
              <div className="metric-icon green">
                <CheckCircle2 size={18} />
              </div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Cases by Status</h3>
              <div className="chart-row">
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="legend">
                  <p>
                    <span style={{ background: "#ff7a18" }} />
                    Pending <b>324 (26%)</b>
                  </p>
                  <p>
                    <span style={{ background: "#1f6feb" }} />
                    In Progress <b>258 (21%)</b>
                  </p>
                  <p>
                    <span style={{ background: "#36c994" }} />
                    Completed <b>866 (53%)</b>
                  </p>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <h3>Cases by Department</h3>
              <div className="chart-row">
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {departmentData.map((_, index) => (
                        <Cell key={index} fill={colors[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="legend">
                  {departmentData.map((item, index) => (
                    <p key={item.name}>
                      <span style={{ background: colors[index] }} />
                      {item.name} <b>{item.value}%</b>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="deadline-card">
            <div className="deadline-header">
              <h3>Upcoming Deadlines</h3>
              <button onClick={handleViewAllDeadlines}>View All</button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Deadline</th>
                  <th>Days Left</th>
                  <th>Priority</th>
                </tr>
              </thead>

              <tbody>
                {deadlines.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.title}</td>
                    <td>{item.department}</td>
                    <td>{item.deadline}</td>
                    <td
                      className={
                        item.priority === "High"
                          ? "red-text"
                          : item.priority === "Medium"
                          ? "orange-text"
                          : "green-text"
                      }
                    >
                      {item.daysLeft}
                    </td>
                    <td
                      className={
                        item.priority === "High"
                          ? "red-text"
                          : item.priority === "Medium"
                          ? "orange-text"
                          : "green-text"
                      }
                    >
                      {item.priority}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
    </AppLayout>
  );
};

export default Dashboard;