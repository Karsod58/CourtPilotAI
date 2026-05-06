import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gavel,
  Send,
  UserCheck,
  X,
  Loader2,
} from "lucide-react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { apiService, type ActionPlan as ActionPlanType } from "../services/apiService";

interface VerifiedCase {
  caseTitle: string;
  caseNumber: string;
  orderDate: string;
  petitioner: string;
  respondent: string;
  directive: string;
  department: string;
  deadline: string;
  judgmentId?: string;
}

const fallbackCase: VerifiedCase = {
  caseTitle: "ABC Welfare Association vs State Government",
  caseNumber: "HC/2024/1234",
  orderDate: "12 May 2026",
  petitioner: "ABC Welfare Association",
  respondent: "State Government",
  directive: "Submit compliance report within 30 days",
  department: "Home Department",
  deadline: "11 June 2026",
};

const ActionPlan = () => {
  const navigate = useNavigate();
  const [assigned, setAssigned] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<string>('');
  const [draftFormat, setDraftFormat] = useState('pdf');
  const [actionPlans, setActionPlans] = useState<ActionPlanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const verifiedCase: VerifiedCase = useMemo(() => {
    const saved = localStorage.getItem("verifiedCase");
    if (saved) {
      return JSON.parse(saved);
    }
    
    // If no saved case, return fallback (user accessed page directly)
    return fallbackCase;
  }, []);

  // Load action plans from backend
  useEffect(() => {
    loadActionPlans();
    loadJudgmentData();
  }, []);

  const loadJudgmentData = async () => {
    try {
      const judgmentId = verifiedCase.judgmentId;
      
      if (!judgmentId) {
        console.log("No judgment ID in verified case");
        return;
      }
      
      const judgment = await apiService.getJudgment(judgmentId);
      
      // Update verified case with real judgment data
      const updatedCase = {
        caseTitle: `${judgment.case_id} - ${judgment.court_name}`,
        caseNumber: judgment.case_id,
        orderDate: new Date(judgment.judgment_date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        petitioner: judgment.petitioner || verifiedCase.petitioner,
        respondent: judgment.respondent || verifiedCase.respondent,
        directive: verifiedCase.directive,
        department: verifiedCase.department,
        deadline: verifiedCase.deadline,
        judgmentId: judgment.id
      };
      
      localStorage.setItem("verifiedCase", JSON.stringify(updatedCase));
    } catch (err) {
      console.error('Error loading judgment data:', err);
      // Continue with existing data
    }
  };

  const loadActionPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getActionPlans();
      setActionPlans(response.items);
      
      // Check if any plans are assigned
      const hasAssigned = response.items.some(plan => 
        plan.status === 'in_progress' || plan.status === 'completed'
      );
      setAssigned(hasAssigned);
    } catch (err) {
      console.error('Error loading action plans:', err);
      setError('Failed to load action plans');
    } finally {
      setLoading(false);
    }
  };

  // Convert backend action plans to display format
  const actionItems = actionPlans.length > 0 
    ? actionPlans.map(plan => ({
        id: plan.id,
        title: plan.title,
        description: plan.description || '',
        owner: plan.department_name,
        deadline: new Date(plan.deadline).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        priority: plan.priority.charAt(0).toUpperCase() + plan.priority.slice(1),
        status: plan.status === 'pending' ? 'Ready' : 
                plan.status === 'in_progress' ? 'Assigned' : 
                plan.status === 'completed' ? 'Completed' : 'Ready',
        progress: plan.progress_percentage
      }))
    : [
        {
          title: "Prepare Compliance Report",
          description:
            "Draft department-level compliance response based on verified court directive.",
          owner: verifiedCase.department,
          deadline: verifiedCase.deadline,
          priority: "High",
          status: assigned ? "Assigned" : "Ready",
        },
        {
          title: "Collect Supporting Evidence",
          description:
            "Gather internal records, approvals and documents required for court submission.",
          owner: "Department Officer",
          deadline: "Within 10 days",
          priority: "Medium",
          status: assigned ? "Assigned" : "Ready",
        },
        {
          title: "Submit Final Report",
          description:
            "Submit verified compliance report to the competent authority before deadline.",
          owner: "Legal Cell",
          deadline: verifiedCase.deadline,
          priority: "High",
          status: assigned ? "Assigned" : "Ready",
        },
      ];

  const handleAssign = async () => {
    try {
      // If we have action plans from backend, update their status
      if (actionPlans.length > 0) {
        await Promise.all(
          actionPlans.map(plan => 
            apiService.updateActionPlanStatus(plan.id, 'in_progress', 'Assigned to department')
          )
        );
      } else if (verifiedCase.judgmentId) {
        // Create new action plans if none exist
        await apiService.createActionPlan({
          judgment_id: verifiedCase.judgmentId,
          department_name: verifiedCase.department,
          title: "Prepare Compliance Report",
          description: "Draft department-level compliance response based on verified court directive.",
          deadline: verifiedCase.deadline,
          priority: 'high'
        });
      }
      
      setAssigned(true);
      localStorage.setItem("actionPlanAssigned", "true");
      
      // Reload action plans
      await loadActionPlans();

      // Navigate to lifecycle
      setTimeout(() => {
        navigate("/lifecycle");
      }, 700);
    } catch (err) {
      console.error('Error assigning action plans:', err);
      // Still navigate even if API fails
      setAssigned(true);
      localStorage.setItem("actionPlanAssigned", "true");
      setTimeout(() => {
        navigate("/lifecycle");
      }, 700);
    }
  };

const handleGenerateDraft = async () => {
  setIsGeneratingDraft(true);
  
  // Simulate AI draft generation with a delay
  setTimeout(() => {
    const draftContent = generateComplianceDraft(verifiedCase, actionItems);
    setGeneratedDraft(draftContent);
    setIsGeneratingDraft(false);
    setShowDraftModal(true);
  }, 2000);
};

const generateComplianceDraft = (caseData: VerifiedCase, actions: any[]) => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
SUBJECT: COMPLIANCE REPORT REGARDING ${caseData.caseNumber}

DATE: ${currentDate}

FROM: ${caseData.department}

TO: The Hon'ble Court

REF: Court Order dated ${caseData.orderDate} in ${caseData.caseNumber}

---

**COMPLIANCE REPORT**

With reference to the Hon'ble Court's order dated ${caseData.orderDate} in the matter of ${caseData.caseTitle} (${caseData.caseNumber}), the undersigned hereby submits the compliance report as per the directive: "${caseData.directive}".

**PARTICULARS OF THE CASE:**
- Case Number: ${caseData.caseNumber}
- Case Title: ${caseData.caseTitle}
- Petitioner: ${caseData.petitioner}
- Respondent: ${caseData.respondent}
- Order Date: ${caseData.orderDate}
- Deadline: ${caseData.deadline}

**COMPLIANCE STATUS:**
The concerned department has initiated necessary steps to comply with the court directive. The following action items have been identified and are being implemented:

${actions.map((item, index) => `
**${index + 1}. ${item.title}**
- Owner: ${item.owner}
- Deadline: ${item.deadline}
- Priority: ${item.priority}
- Status: ${assigned ? 'Assigned' : 'Ready'}
- Description: ${item.description}
`).join('\n')}

**PROGRESS UPDATE:**
All action items have been assigned to respective departments/officers. The compliance process is underway and will be completed within the stipulated timeframe.

**NEXT STEPS:**
1. Regular monitoring of action items
2. Weekly progress reviews
3. Final submission before deadline

**CONCLUSION:**
The department is fully committed to complying with the court directive and ensuring timely submission of all required documents and reports.

**SUBMITTED BY:**
[Designation]
${caseData.department}
Date: ${currentDate}
  `.trim();
};

const handleDownloadDraft = () => {
  const content = generatedDraft;
  const filename = `compliance-report-${verifiedCase.caseNumber.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.${draftFormat}`;
  
  if (draftFormat === 'txt') {
    downloadFile(content, filename, 'text/plain');
  } else if (draftFormat === 'pdf') {
    // For PDF, we'll create a simple text-based PDF simulation
    downloadFile(content, filename, 'application/pdf');
  } else if (draftFormat === 'docx') {
    // For DOCX, we'll create a simple text-based document
    downloadFile(content, filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

  return (
    <AppLayout activeSidebarItem="action-plan" showSearch={false} showUpload={false} pageTitle="Verified Judgment to Action Plan">
      <section className="action-plan-shell">
          <div className="action-topbar">
            <button className="back-btn" onClick={() => navigate("/verification")}>
              <ArrowLeft size={17} />
              Back to Verification
            </button>

            <div className="action-top-actions">
              <button className="download-plan-btn">
                <Download size={16} />
                Export Plan
              </button>

              <button className="assign-plan-btn" onClick={handleAssign}>
                <Send size={16} />
                {assigned ? "Assigned" : "Assign Actions"}
              </button>
            </div>
          </div>

          <div className="action-header">
            <div>
              <p className="action-eyebrow">AI-GENERATED ACTION PLAN</p>
              <h1>Verified Judgment to Action Plan</h1>
              <p>
                CourtPilot converts approved legal directives into accountable
                tasks with ownership, deadlines, risk score, and appeal guidance.
              </p>
            </div>

            <div className="risk-score-card">
              <span>Compliance Risk</span>
              <strong>High</strong>
              <p>Deadline-bound directive requiring department action.</p>
            </div>
          </div>

          <div className="action-plan-grid">
            <div className="case-summary-panel">
              <h2>Case Summary</h2>

              <div className="summary-row">
                <span>Case Number</span>
                <b>{verifiedCase.caseNumber}</b>
              </div>

              <div className="summary-row">
                <span>Case Title</span>
                <b>{verifiedCase.caseTitle}</b>
              </div>

              <div className="summary-row">
                <span>Order Date</span>
                <b>{verifiedCase.orderDate}</b>
              </div>

              <div className="summary-row">
                <span>Petitioner</span>
                <b>{verifiedCase.petitioner}</b>
              </div>

              <div className="summary-row">
                <span>Respondent</span>
                <b>{verifiedCase.respondent}</b>
              </div>

              <div className="directive-box">
                <span>Verified Directive</span>
                <p>{verifiedCase.directive}</p>
              </div>
            </div>

            <div className="decision-panel">
              <h2>Decision Intelligence</h2>

              <div className="decision-card green">
                <div>
                  <CheckCircle2 size={20} />
                  <span>Recommended Action</span>
                </div>
                <h3>Comply with Court Direction</h3>
                <p>
                  Directive is clear, time-bound, and requires administrative
                  compliance.
                </p>
              </div>

              <div className="decision-card blue">
                <div>
                  <Gavel size={20} />
                  <span>Appeal Success Predictor</span>
                </div>
                <h3>32% Success Probability</h3>
                <p>
                  Similar case analysis indicates low appeal success. Compliance
                  is recommended.
                </p>
              </div>

              <div className="decision-card orange">
                <div>
                  <AlertTriangle size={20} />
                  <span>Risk Score Engine</span>
                </div>
                <h3>High Priority</h3>
                <p>
                  Deadline proximity and directive type increase compliance risk.
                </p>
              </div>
            </div>
          </div>

          <div className="task-section">
            <div className="task-section-header">
              <div>
                <h2>Structured Action Items</h2>
                <p>Generated from verified judgment data</p>
              </div>

              <span>{actionItems.length} Tasks</span>
            </div>

            <div className="task-grid">
              {actionItems.map((item, index) => (
                <div className="task-card" key={item.title}>
                  <div className="task-top">
                    <div className="task-number">{index + 1}</div>
                    <span
                      className={
                        item.priority === "High"
                          ? "task-priority high"
                          : "task-priority medium"
                      }
                    >
                      {item.priority}
                    </span>
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.description}</p>

                  <div className="task-meta">
                    <div>
                      <UserCheck size={15} />
                      <span>{item.owner}</span>
                    </div>

                    <div>
                      <Clock3 size={15} />
                      <span>{item.deadline}</span>
                    </div>
                  </div>

                  <div className={assigned ? "task-status assigned" : "task-status"}>
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="draft-section">
            <div className="draft-card">
              <div>
                <h2>Auto-Compliance Draft</h2>
                <p>
                  AI-generated draft report based on verified directive and
                  structured action plan.
                </p>
              </div>

              <button onClick={handleGenerateDraft} disabled={isGeneratingDraft}>
                {isGeneratingDraft ? (
                  <Loader2 size={16} className="spin-icon" />
                ) : (
                  <FileText size={16} />
                )}
                {isGeneratingDraft ? 'Generating...' : 'Generate Draft'}
              </button>
            </div>

            <div className="draft-preview">
              <h3>Draft Preview</h3>
              <p>
                Subject: Compliance report regarding {verifiedCase.caseNumber}
              </p>
              <p>
                With reference to the order dated {verifiedCase.orderDate}, the
                concerned department has initiated necessary steps to comply with
                the directive: “{verifiedCase.directive}”.
              </p>
            </div>
          </div>

        {/* Draft Generation Modal */}
        {showDraftModal && (
          <div className="modal-overlay">
            <div className="modal-content draft-modal">
              <div className="modal-header">
                <h3>Generated Compliance Draft</h3>
                <button className="modal-close" onClick={() => setShowDraftModal(false)}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Download Format</label>
                  <select value={draftFormat} onChange={(e) => setDraftFormat(e.target.value)}>
                    <option value="pdf">PDF Document</option>
                    <option value="docx">Word Document</option>
                    <option value="txt">Text File</option>
                  </select>
                </div>
                
                <div className="draft-content">
                  <h4>Draft Preview</h4>
                  <div className="draft-text">
                    {generatedDraft.split('\n').map((line, index) => (
                      <div key={index} className="draft-line">
                        {line || <br />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowDraftModal(false)}>
                  Close
                </button>
                <button className="btn-primary" onClick={handleDownloadDraft}>
                  <Download size={16} />
                  Download {draftFormat.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )}
        </section>
    </AppLayout>
  );
};

export default ActionPlan;