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
import { dataService } from "../services/dataService";

const analyticsData = dataService.getAnalyticsData();
const departmentData = analyticsData.departmentPerformance.map(dept => ({
  name: dept.department,
  value: dept.completion,
  cases: dept.cases
}));
const statusData = analyticsData.statusDistribution;
const monthlyTrend = analyticsData.trends.monthly;

const riskDistribution = (() => {
  const totalHigh = analyticsData.riskAnalysis.reduce((sum, category) => sum + category.high, 0);
  const totalMedium = analyticsData.riskAnalysis.reduce((sum, category) => sum + category.medium, 0);
  const totalLow = analyticsData.riskAnalysis.reduce((sum, category) => sum + category.low, 0);
  const grandTotal = totalHigh + totalMedium + totalLow;
  
  return [
    { risk: "High", count: totalHigh, percentage: Math.round((totalHigh / grandTotal) * 100) },
    { risk: "Medium", count: totalMedium, percentage: Math.round((totalMedium / grandTotal) * 100) },
    { risk: "Low", count: totalLow, percentage: Math.round((totalLow / grandTotal) * 100) }
  ];
})();

const Analytics = () => {
  return (
    <AppLayout activeSidebarItem="analytics" pageTitle="Analytics Dashboard">
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
            <h2>1,448</h2>
            <span className="positive">+12.5%</span>
          </div>
          <p>vs previous period</p>
        </div>

        <div className="overview-card">
          <div className="overview-header">
            <span>Average Processing Time</span>
            <TrendingDown size={16} className="trend-down" />
          </div>
          <div className="overview-value">
            <h2>3.2 days</h2>
            <span className="positive">-18.7%</span>
          </div>
          <p>vs previous period</p>
        </div>

        <div className="overview-card">
          <div className="overview-header">
            <span>Compliance Rate</span>
            <TrendingUp size={16} className="trend-up" />
          </div>
          <div className="overview-value">
            <h2>87.3%</h2>
            <span className="positive">+5.2%</span>
          </div>
          <p>of deadlines met</p>
        </div>

        <div className="overview-card">
          <div className="overview-header">
            <span>High Risk Cases</span>
            <AlertTriangle size={16} className="trend-neutral" />
          </div>
          <div className="overview-value">
            <h2>134</h2>
            <span className="neutral">+2.1%</span>
          </div>
          <p>requiring attention</p>
        </div>
      </div>

      <div className="analytics-charts">
        <div className="chart-row">
          <div className="chart-card">
            <h3>Cases by Department</h3>
            <div className="chart-content">
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
                      <Cell key={index} fill={["#ff7a18", "#1f6feb", "#36c994", "#2bc7d3", "#7c3aed"][index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {departmentData.map((item, index) => (
                  <div key={item.name} className="legend-item">
                    <span style={{ background: ["#ff7a18", "#1f6feb", "#36c994", "#2bc7d3", "#7c3aed"][index] }} />
                    <div>
                      <span>{item.name}</span>
                      <b>{item.cases} cases</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h3>Case Status Distribution</h3>
            <div className="chart-content">
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
      </div>
    </AppLayout>
  );
};

export default Analytics;
