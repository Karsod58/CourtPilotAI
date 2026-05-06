import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, User, AlertTriangle, FileText, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { apiService, type Judgment, type Directive } from "../services/apiService";

const CaseDetail = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'timeline' | 'actions'>('overview');
  const [caseData, setCaseData] = useState<Judgment | null>(null);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    if (!caseId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [judgment, directivesResponse] = await Promise.all([
        apiService.getJudgment(caseId),
        apiService.getJudgmentDirectives(caseId)
      ]);
      
      setCaseData(judgment);
      setDirectives(directivesResponse.items);
    } catch (err) {
      console.error('Error loading case data:', err);
      setError("Failed to load case details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FileText size={16} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={16} /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
    { id: 'actions', label: 'Actions', icon: <AlertTriangle size={16} /> }
  ] as const;

  const handleBack = () => {
    navigate('/cases');
  };

  return (
    <AppLayout activeSidebarItem="cases" pageTitle={`Case ${caseId}`}>
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading case details...</p>
        </div>
      ) : error || !caseData ? (
        <div className="error-state">
          <AlertTriangle size={48} />
          <h3>Error Loading Case</h3>
          <p>{error || "Case not found"}</p>
          <button onClick={() => navigate('/cases')}>Back to Cases</button>
        </div>
      ) : (
      <div className="case-detail-container">
        <div className="case-detail-header">
          <button className="back-btn" onClick={handleBack}>
            <ArrowLeft size={16} />
            Back to Cases
          </button>
          
          <div className="case-title-section">
            <h1>{caseData.case_id} - {caseData.court_name}</h1>
            <div className="case-meta">
              <span className={`status-badge ${caseData.status.toLowerCase().replace('_', '-')}`}>
                {caseData.status.replace('_', ' ')}
              </span>
              <span className={`priority-badge medium`}>
                {caseData.case_type}
              </span>
            </div>
          </div>
        </div>

        <div className="case-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="case-content">
          {activeTab === 'overview' && (
            <div className="tab-content">
              <div className="case-info-grid">
                <div className="info-card">
                  <h3>Case Information</h3>
                  <div className="info-row">
                    <span>Case ID</span>
                    <strong>{caseData.case_id}</strong>
                  </div>
                  <div className="info-row">
                    <span>Court</span>
                    <strong>{caseData.court_name}</strong>
                  </div>
                  <div className="info-row">
                    <span>Case Type</span>
                    <strong>{caseData.case_type}</strong>
                  </div>
                  <div className="info-row">
                    <span>Petitioner</span>
                    <strong>{caseData.petitioner || "N/A"}</strong>
                  </div>
                  <div className="info-row">
                    <span>Respondent</span>
                    <strong>{caseData.respondent || "N/A"}</strong>
                  </div>
                  <div className="info-row">
                    <span>Judge</span>
                    <strong>{caseData.judge_name || "N/A"}</strong>
                  </div>
                  <div className="info-row">
                    <span>Status</span>
                    <strong>{caseData.status.replace('_', ' ')}</strong>
                  </div>
                  <div className="info-row">
                    <span>Pages</span>
                    <strong>{caseData.page_count || 0}</strong>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h3>Timeline</h3>
                <div className="timeline-dates">
                  <div className="date-item">
                    <span>Uploaded</span>
                    <strong>{new Date(caseData.uploaded_at).toLocaleDateString()}</strong>
                  </div>
                  <div className="date-item">
                    <span>Judgment Date</span>
                    <strong>{new Date(caseData.judgment_date).toLocaleDateString()}</strong>
                  </div>
                  {caseData.processed_at && (
                    <div className="date-item">
                      <span>Processed</span>
                      <strong>{new Date(caseData.processed_at).toLocaleDateString()}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="tab-content">
              <h3>Documents (1)</h3>
              <div className="documents-list">
                <div className="document-item">
                  <div className="doc-icon">
                    <FileText size={20} />
                  </div>
                  <div className="doc-info">
                    <h4>{caseData.case_id}.pdf</h4>
                    <p>Original judgment document</p>
                    <div className="doc-meta">
                      <span>Uploaded: {new Date(caseData.uploaded_at).toLocaleDateString()}</span>
                      <span>Pages: {caseData.page_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="tab-content">
              <h3>Case Timeline</h3>
              <div className="timeline-events">
                <div className="timeline-item">
                  <div className="timeline-marker completed">
                    <div className="marker-content">
                      <span>{new Date(caseData.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="timeline-content">
                    <h4>Case Uploaded</h4>
                    <p>Judgment document uploaded to system</p>
                    <span className="timeline-date">{new Date(caseData.uploaded_at).toLocaleString()}</span>
                  </div>
                </div>
                {caseData.processed_at && (
                  <div className="timeline-item">
                    <div className="timeline-marker completed">
                      <div className="marker-content">
                        <span>{new Date(caseData.processed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="timeline-content">
                      <h4>AI Processing Complete</h4>
                      <p>Directives extracted and analyzed</p>
                      <span className="timeline-date">{new Date(caseData.processed_at).toLocaleString()}</span>
                    </div>
                  </div>
                )}
                {caseData.status === 'pending_verification' && (
                  <div className="timeline-item">
                    <div className="timeline-marker in-progress">
                      <div className="marker-content">
                        <span>Now</span>
                      </div>
                    </div>
                    <div className="timeline-content">
                      <h4>Pending Verification</h4>
                      <p>Awaiting human verification of extracted directives</p>
                      <span className="timeline-date">Current Status</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="tab-content">
              <h3>Directives ({directives.length})</h3>
              {directives.length === 0 ? (
                <p>No directives extracted yet.</p>
              ) : (
                <div className="actions-list">
                  {directives.map((directive, index) => (
                    <div key={directive.id} className="action-item">
                      <div className="action-header">
                        <span className="action-number">{index + 1}</span>
                        <h4>{directive.directive_type || `Directive ${index + 1}`}</h4>
                        <span className={`action-status ${directive.status.toLowerCase().replace('_', '-')}`}>
                          {directive.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="action-content">
                        <p>{directive.directive_text}</p>
                        <div className="action-meta">
                          <div className="meta-item">
                            <User size={14} />
                            <span>{directive.assigned_department || directive.responsible_entity}</span>
                          </div>
                          {directive.deadline && (
                            <div className="meta-item">
                              <Calendar size={14} />
                              <span>Due: {new Date(directive.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                          <div className="meta-item">
                            <span>Priority: {directive.priority}</span>
                          </div>
                          <div className="meta-item">
                            <span>Confidence: {Math.round(directive.confidence_score * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </AppLayout>
  );
};

export default CaseDetail;
