import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, AlertTriangle, Filter, Search, Loader2 } from 'lucide-react';
import { apiService, type Deadline as DeadlineType } from '../services/apiService';
import AppLayout from '../components/layout/AppLayout';

interface DeadlineItem {
  id: string;
  title: string;
  department: string;
  deadline: string;
  daysLeft: number;
  priority: 'High' | 'Medium' | 'Low';
  status: string;
  assignedTo?: string;
  judgmentId: string;
}

const Deadlines = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | string>('all');
  const [allDeadlines, setAllDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  // Load deadlines from backend
  useEffect(() => {
    loadDeadlines();
  }, []);

  const loadDeadlines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [deadlinesResponse, stats] = await Promise.all([
        apiService.getAllDeadlines(90, false),
        apiService.getDeadlineStatistics()
      ]);
      
      // Transform backend data to display format
      const transformedDeadlines: DeadlineItem[] = deadlinesResponse.items.map(deadline => ({
        id: deadline.id,
        title: deadline.title,
        department: deadline.department,
        deadline: new Date(deadline.deadline).toLocaleDateString('en-IN', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric'
        }),
        daysLeft: deadline.days_until,
        priority: deadline.priority.charAt(0).toUpperCase() + deadline.priority.slice(1) as 'High' | 'Medium' | 'Low',
        status: deadline.status === 'pending' ? 'Pending' : 
                deadline.status === 'in_progress' ? 'In Progress' : 
                deadline.status === 'completed' ? 'Completed' : 'Pending',
        judgmentId: deadline.judgment_id
      }));
      
      setAllDeadlines(transformedDeadlines.sort((a, b) => a.daysLeft - b.daysLeft));
      setStatistics(stats);
    } catch (err) {
      console.error('Error loading deadlines:', err);
      setError('Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(allDeadlines.map(d => d.department));
    return Array.from(depts);
  }, [allDeadlines]);

  // Filter deadlines based on search and filters
  const filteredDeadlines = useMemo(() => {
    return allDeadlines.filter(deadline => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          deadline.title.toLowerCase().includes(query) ||
          deadline.department.toLowerCase().includes(query) ||
          deadline.id.toLowerCase().includes(query) ||
          deadline.assignedTo?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && deadline.priority !== priorityFilter) {
        return false;
      }

      // Department filter
      if (departmentFilter !== 'all' && deadline.department !== departmentFilter) {
        return false;
      }

      return true;
    });
  }, [allDeadlines, searchQuery, priorityFilter, departmentFilter]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-orange-600 bg-orange-50';
      case 'Low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDaysLeftColor = (daysLeft: number) => {
    if (daysLeft <= 3) return 'text-red-600 font-semibold';
    if (daysLeft <= 7) return 'text-orange-600';
    if (daysLeft <= 14) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getDaysLeftIcon = (daysLeft: number) => {
    if (daysLeft <= 3) return <AlertTriangle size={16} className="text-red-500" />;
    if (daysLeft <= 7) return <Clock size={16} className="text-orange-500" />;
    return <Calendar size={16} className="text-green-500" />;
  };

  if (loading) {
    return (
      <AppLayout activeSidebarItem="deadlines" pageTitle="All Deadlines">
        <div className="loading-state" style={{ textAlign: 'center', padding: '4rem' }}>
          <Loader2 size={48} className="spin-icon" style={{ margin: '0 auto 1rem' }} />
          <p>Loading deadlines...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout activeSidebarItem="deadlines" pageTitle="All Deadlines">
        <div className="error-state" style={{ textAlign: 'center', padding: '4rem' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
          <h3>Error Loading Deadlines</h3>
          <p>{error}</p>
          <button onClick={loadDeadlines} style={{ marginTop: '1rem' }}>Retry</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeSidebarItem="deadlines" pageTitle="All Deadlines">
      <div className="deadlines-page">
        {/* Header */}
        <div className="deadlines-header">
          <div className="deadlines-header-left">
            <button 
              className="back-btn"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
            <h1>All Upcoming Deadlines</h1>
            <p>Track and manage all case deadlines across departments</p>
          </div>
          
          <div className="deadlines-stats">
            <div className="stat-card">
              <div className="stat-number">{allDeadlines.length}</div>
              <div className="stat-label">Total Deadlines</div>
            </div>
            <div className="stat-card urgent">
              <div className="stat-number">
                {statistics?.overdue || allDeadlines.filter(d => d.daysLeft < 0).length}
              </div>
              <div className="stat-label">Overdue</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-number">
                {statistics?.due_this_week || allDeadlines.filter(d => d.daysLeft >= 0 && d.daysLeft <= 7).length}
              </div>
              <div className="stat-label">This Week (≤7 days)</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="deadlines-filters">
          <div className="filter-group">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by case title, department, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">
              <Filter size={16} />
              Priority
            </label>
            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">
              <Filter size={16} />
              Department
            </label>
            <select 
              value={departmentFilter} 
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="results-count">
          Showing {filteredDeadlines.length} of {allDeadlines.length} deadlines
        </div>

        {/* Deadlines Table */}
        <div className="deadlines-table-container">
          <table className="deadlines-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Title</th>
                <th>Department</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Days Left</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeadlines.map((deadline) => (
                <tr 
                  key={deadline.id} 
                  className="deadline-row"
                  onClick={() => navigate(`/cases/${deadline.id}`)}
                >
                  <td className="case-id">{deadline.id}</td>
                  <td className="case-title">{deadline.title}</td>
                  <td className="department">{deadline.department}</td>
                  <td className="assigned-to">{deadline.assignedTo || 'Unassigned'}</td>
                  <td className="status">
                    <span className={`status-badge ${deadline.status.toLowerCase().replace(' ', '-')}`}>
                      {deadline.status}
                    </span>
                  </td>
                  <td className="deadline-date">{deadline.deadline}</td>
                  <td className={`days-left ${getDaysLeftColor(deadline.daysLeft)}`}>
                    <div className="days-left-content">
                      {getDaysLeftIcon(deadline.daysLeft)}
                      {deadline.daysLeft} days
                    </div>
                  </td>
                  <td className="priority">
                    <span className={`priority-badge ${getPriorityColor(deadline.priority)}`}>
                      {deadline.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredDeadlines.length === 0 && (
            <div className="no-results">
              <Calendar size={48} className="text-gray-300" />
              <h3>No deadlines found</h3>
              <p>Try adjusting your filters or search criteria</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Deadlines;
