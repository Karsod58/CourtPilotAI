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
import { useState } from "react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { dataService } from "../services/dataService";

const cases = dataService.getCasesData();

// Generate action items for each case based on case details
const generateCaseActions = (caseItem: any) => {
  const baseActions = [
    {
      id: 1,
      title: "Review Case Documentation",
      description: "Examine all case documents and verify completeness",
      status: caseItem.status === "Completed" ? "completed" : "pending",
      priority: "High",
      dueDate: caseItem.deadline,
      assignedTo: caseItem.assignedTo,
      estimatedTime: "2 hours"
    },
    {
      id: 2,
      title: "Compliance Check",
      description: "Verify compliance with regulatory requirements",
      status: caseItem.complianceScore > 80 ? "completed" : "in-progress",
      priority: caseItem.risk === "High" ? "High" : "Medium",
      dueDate: caseItem.deadline,
      assignedTo: caseItem.assignedTo,
      estimatedTime: "3 hours"
    },
    {
      id: 3,
      title: "Risk Assessment",
      description: "Evaluate potential risks and mitigation strategies",
      status: "pending",
      priority: caseItem.risk === "High" ? "Critical" : "Medium",
      dueDate: caseItem.deadline,
      assignedTo: caseItem.assignedTo,
      estimatedTime: "1 hour"
    }
  ];

  // Add case-specific actions based on department
  const departmentActions: { [key: string]: any } = {
    "Legal": [
      {
        id: 4,
        title: "Legal Framework Review",
        description: "Review applicable laws and regulations",
        status: "pending",
        priority: "High",
        dueDate: caseItem.deadline,
        assignedTo: caseItem.assignedTo,
        estimatedTime: "4 hours"
      }
    ],
    "Finance": [
      {
        id: 4,
        title: "Financial Analysis",
        description: "Conduct detailed financial impact analysis",
        status: "pending",
        priority: "High",
        dueDate: caseItem.deadline,
        assignedTo: caseItem.assignedTo,
        estimatedTime: "3 hours"
      }
    ],
    "Health": [
      {
        id: 4,
        title: "Health Impact Assessment",
        description: "Assess health implications and benefits",
        status: "pending",
        priority: "High",
        dueDate: caseItem.deadline,
        assignedTo: caseItem.assignedTo,
        estimatedTime: "2 hours"
      }
    ]
  };

  return [...baseActions, ...(departmentActions[caseItem.department] || [])].slice(0, caseItem.actions);
};

const Cases = () => {
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseActions, setCaseActions] = useState<any[]>([]);

  const handleViewActions = (caseItem: any) => {
    setSelectedCase(caseItem);
    const actions = generateCaseActions(caseItem);
    setCaseActions(actions);
    setShowActionsModal(true);
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
      <div className="cases-header">
        <div className="cases-stats">
          <div className="stat-card">
            <span>Total Cases</span>
            <h2>1,248</h2>
            <p>All time</p>
          </div>
          <div className="stat-card">
            <span>Active</span>
            <h2>324</h2>
            <p>Currently in progress</p>
          </div>
          <div className="stat-card">
            <span>Completed</span>
            <h2>866</h2>
            <p>Successfully closed</p>
          </div>
          <div className="stat-card urgent">
            <span>Urgent</span>
            <h2>58</h2>
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
          <h3>All Cases</h3>
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search cases..." />
          </div>
        </div>

        <table className="cases-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Title</th>
              <th>Department</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Deadline</th>
              <th>Risk</th>
              <th>Assigned To</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((case_) => (
              <tr key={case_.id}>
                <td className="case-id">{case_.id}</td>
                <td className="case-title">{case_.title}</td>
                <td>{case_.department}</td>
                <td>
                  <span className={`status-badge ${case_.status.replace(" ", "-").toLowerCase()}`}>
                    {case_.status}
                  </span>
                </td>
                <td>
                  <span className={`priority-badge ${case_.priority.toLowerCase()}`}>
                    {case_.priority}
                  </span>
                </td>
                <td className="deadline">
                  <Calendar size={14} />
                  {formatDate(case_.deadline)}
                </td>
                <td>
                  <span className={`risk-badge ${case_.risk.toLowerCase()}`}>
                    <AlertTriangle size={12} />
                    {case_.risk}
                  </span>
                </td>
                <td>{case_.assignedTo}</td>
                <td>
                  <button className="view-btn" onClick={() => handleViewActions(case_)}>
                    <FileText size={14} />
                    Actions
                  </button>
                </td>
              </tr>
            ))}
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
                    <span>Department</span>
                    <strong>{selectedCase.department}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Assigned To</span>
                    <strong>{selectedCase.assignedTo}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Deadline</span>
                    <strong>{formatDate(selectedCase.deadline)}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Priority</span>
                    <strong>{selectedCase.priority}</strong>
                  </div>
                </div>
              </div>

              <div className="actions-list">
                <h4>Required Actions ({caseActions.length})</h4>
                {caseActions.map((action) => (
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
                      <div className="detail-item">
                        <Calendar size={14} />
                        <span>Due: {formatDate(action.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
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
    </AppLayout>
  );
};

export default Cases;
