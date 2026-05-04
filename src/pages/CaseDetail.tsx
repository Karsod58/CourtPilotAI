import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, User, AlertTriangle, FileText, Clock } from "lucide-react";
import { useState } from "react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";

const CaseDetail = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'timeline' | 'actions'>('overview');

  // Mock case data - in real app, this would come from API
  const caseData = {
    id: caseId,
    title: "Case HC/2024/1234 - Infrastructure Development Contract",
    description: "Contract for development of highway infrastructure including road construction and bridge development",
    status: "In Progress",
    priority: "High",
    risk: "Medium",
    department: "PWD",
    deadline: "2024-06-15",
    assignedTo: "Anita Sharma",
    complianceScore: 78,
    createdDate: "2024-05-01",
    lastUpdated: "2024-06-10",
    tags: ["Infrastructure", "Contract", "High Priority"],
    documents: 12,
    actions: 8
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
      <div className="case-detail-container">
        <div className="case-detail-header">
          <button className="back-btn" onClick={handleBack}>
            <ArrowLeft size={16} />
            Back to Cases
          </button>
          
          <div className="case-title-section">
            <h1>{caseData.title}</h1>
            <div className="case-meta">
              <span className={`status-badge ${caseData.status.toLowerCase().replace(' ', '-')}`}>
                {caseData.status}
              </span>
              <span className={`priority-badge ${caseData.priority.toLowerCase()}`}>
                {caseData.priority}
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
                    <strong>{caseData.id}</strong>
                  </div>
                  <div className="info-row">
                    <span>Department</span>
                    <strong>{caseData.department}</strong>
                  </div>
                  <div className="info-row">
                    <span>Assigned To</span>
                    <strong>{caseData.assignedTo}</strong>
                  </div>
                  <div className="info-row">
                    <span>Status</span>
                    <strong>{caseData.status}</strong>
                  </div>
                  <div className="info-row">
                    <span>Priority</span>
                    <strong>{caseData.priority}</strong>
                  </div>
                  <div className="info-row">
                    <span>Risk Level</span>
                    <strong>{caseData.risk}</strong>
                  </div>
                  <div className="info-row">
                    <span>Compliance Score</span>
                    <strong>{caseData.complianceScore}%</strong>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h3>Timeline</h3>
                <div className="timeline-dates">
                  <div className="date-item">
                    <span>Created</span>
                    <strong>{new Date(caseData.createdDate).toLocaleDateString()}</strong>
                  </div>
                  <div className="date-item">
                    <span>Last Updated</span>
                    <strong>{new Date(caseData.lastUpdated).toLocaleDateString()}</strong>
                  </div>
                  <div className="date-item">
                    <span>Deadline</span>
                    <strong>{new Date(caseData.deadline).toLocaleDateString()}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="tab-content">
              <h3>Documents ({caseData.documents})</h3>
              <div className="documents-list">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="document-item">
                    <div className="doc-icon">
                      <FileText size={20} />
                    </div>
                    <div className="doc-info">
                      <h4>Document_{index + 1}.pdf</h4>
                      <p>Contract agreement and supporting documents</p>
                      <div className="doc-meta">
                        <span>Uploaded: May {15 + index}, 2024</span>
                        <span>Size: 2.4 MB</span>
                      </div>
                    </div>
                  </div>
                ))}
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
                      <span>May 1</span>
                    </div>
                  </div>
                  <div className="timeline-content">
                    <h4>Case Created</h4>
                    <p>Initial case filing and documentation setup</p>
                    <span className="timeline-date">May 1, 2024 - 10:30 AM</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker in-progress">
                    <div className="marker-content">
                      <span>May 5</span>
                    </div>
                  </div>
                  <div className="timeline-content">
                    <h4>Department Review</h4>
                    <p>PWD review of contract requirements and scope</p>
                    <span className="timeline-date">May 5, 2024 - 2:15 PM</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker pending">
                    <div className="marker-content">
                      <span>Jun 10</span>
                    </div>
                  </div>
                  <div className="timeline-content">
                    <h4>Compliance Check</h4>
                    <p>Final compliance verification and report submission</p>
                    <span className="timeline-date">June 10, 2024 - 4:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="tab-content">
              <h3>Required Actions ({caseData.actions})</h3>
              <div className="actions-list">
                {[...Array(caseData.actions)].map((_, index) => (
                  <div key={index} className="action-item">
                    <div className="action-header">
                      <span className="action-number">{index + 1}</span>
                      <h4>Action Item {index + 1}</h4>
                      <span className="action-status pending">Pending</span>
                    </div>
                    <div className="action-content">
                      <p>Complete case documentation review and verification</p>
                      <div className="action-meta">
                        <div className="meta-item">
                          <User size={14} />
                          <span>Assigned to: {caseData.assignedTo}</span>
                        </div>
                        <div className="meta-item">
                          <Calendar size={14} />
                          <span>Due: {new Date(caseData.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CaseDetail;
