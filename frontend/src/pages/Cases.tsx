import {
  AlertTriangle,
  Calendar,
  FileText,
  Search,
  Filter,
  Download,
  X,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { apiService, type Judgment } from "../services/apiService";

const Cases = () => {
  const [cases, setCases] = useState<Judgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Judgment | null>(null);
  const [caseActions, setCaseActions] = useState<any[]>([]);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getJudgments();
      setCases(response.items);
    } catch (err) {
      console.error('Error loading cases:', err);
      setError('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const handleViewActions = async (case_: Judgment) => {
    setSelectedCase(case_);
    setShowActionsModal(true);
    
    try {
      const directives = await apiService.getJudgmentDirectives(case_.id);
      setCaseActions(directives.items.map((d: any) => ({
        id: d.id,
        title: d.directive_text.substring(0, 100) + '...',
        description: d.directive_text,
        status: d.verification_status || 'pending',
        priority: d.priority || 'medium',
        assignedTo: d.assigned_department || 'Unassigned',
        estimatedTime: '2-3 days',
        dueDate: d.deadline
      })));
    } catch (err) {
      console.error('Error loading directives:', err);
      setCaseActions([]);
    }
  };

  const filteredCases = cases.filter(case_ =>
    case_.case_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    case_.court_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (case_.petitioner && case_.petitioner.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (case_.respondent && case_.respondent.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const statusCounts = {
    total: cases.length,
    active: cases.filter(c => c.status === 'processed' || c.status === 'verified').length,
    completed: cases.filter(c => c.status === 'completed').length,
    urgent: cases.filter(c => c.status === 'pending').length
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <AppLayout activeSidebarItem="cases" pageTitle="Cases Management">
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading cases...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <AlertTriangle size={48} />
          <h3>Error Loading Cases</h3>
          <p>{error}</p>
          <button onClick={loadCases}>Retry</button>
        </div>
      ) : (
        <>
      <div className="cases-header">
        <div className="cases-stats">
          <div className="stat-card">
            <span>Total Cases</span>
            <h2>{statusCounts.total}</h2>
            <p>All time</p>
          </div>
          <div className="stat-card">
            <span>Active</span>
            <h2>{statusCounts.active}</h2>
            <p>Currently in progress</p>
          </div>
          <div className="stat-card">
            <span>Completed</span>
            <h2>{statusCounts.completed}</h2>
            <p>Successfully closed</p>
          </div>
          <div className="stat-card urgent">
            <span>Urgent</span>
            <h2>{statusCounts.urgent}</h2>
            <p>High priority cases</p>
          </div>
        </div>

        <div className="cases-actions">
          <button className="action-btn">
            <Filter size={16} />
            Filter
          </button>
          <button className="action-btn">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="cases-table-container">
        <div className="table-header">
          <h3>All Cases ({filteredCases.length})</h3>
          <div className="search-box">
            <Search size={16} />
            <input 
              placeholder="Search cases..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <table className="cases-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Court</th>
              <th>Petitioner</th>
              <th>Respondent</th>
              <th>Status</th>
              <th>Date</th>
              <th>Pages</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  No cases found
                </td>
              </tr>
            ) : (
              filteredCases.map((case_) => (
              <tr key={case_.id}>
                <td className="case-id">{case_.case_id}</td>
                <td className="case-title">{case_.court_name}</td>
                <td>{case_.petitioner || "N/A"}</td>
                <td>{case_.respondent || "N/A"}</td>
                <td>
                  <span className={`status-badge ${case_.status.replace("_", "-").toLowerCase()}`}>
                    {case_.status.replace("_", " ")}
                  </span>
                </td>
                <td className="deadline">
                  <Calendar size={14} />
                  {formatDate(case_.judgment_date)}
                </td>
                <td>{case_.page_count || 0}</td>
                <td>
                  <button className="view-btn" onClick={() => handleViewActions(case_)}>
                    <FileText size={14} />
                    View
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* Actions Modal */}
      {showActionsModal && selectedCase && (
        <div className="modal-overlay">
          <div className="modal-content actions-modal">
            <div className="modal-header">
              <div>
                <h3>Case Actions - {selectedCase.id}</h3>
                <p>{selectedCase.title}</p>
              </div>
              <button className="modal-close" onClick={() => setShowActionsModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="case-summary">
                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Court</span>
                    <strong>{selectedCase.court_name}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Case Type</span>
                    <strong>{selectedCase.case_type}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Date</span>
                    <strong>{formatDate(selectedCase.judgment_date)}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Status</span>
                    <strong>{selectedCase.status}</strong>
                  </div>
                </div>
              </div>

              <div className="actions-list">
                <h4>Directives ({caseActions.length})</h4>
                {caseActions.length === 0 ? (
                  <p>No directives found for this case.</p>
                ) : (
                  caseActions.map((action) => (
                    <div key={action.id} className="action-item">
                      <div className="action-header">
                        <div className="action-title">
                          <h5>{action.title}</h5>
                          <span className={`action-status ${action.status}`}>
                            {action.status === 'completed' && <CheckCircle2 size={12} />}
                            {action.status === 'in-progress' && <Clock size={12} />}
                            {action.status === 'pending' && <AlertCircle size={12} />}
                            {action.status}
                          </span>
                        </div>
                        <div className="action-meta">
                          <span className={`priority-badge ${action.priority.toLowerCase()}`}>
                            {action.priority}
                          </span>
                          <span className="estimated-time">
                            <Clock size={12} />
                            {action.estimatedTime}
                          </span>
                        </div>
                      </div>
                      <p className="action-description">{action.description}</p>
                      <div className="action-details">
                        <div className="detail-item">
                          <User size={14} />
                          <span>{action.assignedTo}</span>
                        </div>
                        {action.dueDate && (
                          <div className="detail-item">
                            <Calendar size={14} />
                            <span>Due: {formatDate(action.dueDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowActionsModal(false)}>
                Close
              </button>
              <button className="btn-primary">
                <FileText size={16} />
                Export Actions
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </AppLayout>
  );
};

export default Cases;
