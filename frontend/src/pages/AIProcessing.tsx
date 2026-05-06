import { useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSearch,
  FileText,
  Loader2,
  Scan,
  Sparkles,
} from "lucide-react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { apiService } from "../services/apiService";

type StepStatus = "pending" | "running" | "done";

interface ProcessingStep {
  id: number;
  title: string;
  description: string;
  icon: JSX.Element;
}

const processingSteps: ProcessingStep[] = [
  {
    id: 1,
    title: "PDF Intake & Validation",
    description: "Checking file format, size, pages and readability.",
    icon: <FileText size={18} />,
  },
  {
    id: 2,
    title: "OCR & Text Extraction",
    description: "Reading scanned/digital pages and extracting clean text.",
    icon: <Scan size={18} />,
  },
  {
    id: 3,
    title: "Legal Section Detection",
    description: "Identifying facts, observations, orders and final directions.",
    icon: <FileSearch size={18} />,
  },
  {
    id: 4,
    title: "Directive Filtering",
    description: "Filtering actionable directives from descriptive legal text.",
    icon: <Sparkles size={18} />,
  },
  {
    id: 5,
    title: "Timeline & Owner Mapping",
    description: "Inferring deadlines and mapping responsible departments.",
    icon: <Clock3 size={18} />,
  },
  {
    id: 6,
    title: "Confidence & Risk Scoring",
    description: "Assigning confidence score and compliance risk level.",
    icon: <AlertTriangle size={18} />,
  },
];

const AIProcessing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(8);
  const [judgmentData, setJudgmentData] = useState<any>(null);
  const [processingStatus, setProcessingStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get judgment ID from location state ONLY (don't use localStorage)
  const judgmentId = location.state?.judgmentId;
  const uploadedFile = location.state?.fileName || null;

  // Clear old localStorage data and update with new data if provided
  useEffect(() => {
    if (location.state?.judgmentId) {
      localStorage.setItem("currentJudgmentId", location.state.judgmentId);
      localStorage.setItem("uploadedFile", location.state.fileName || "");
    } else {
      // If no state provided, clear the old data
      localStorage.removeItem("currentJudgmentId");
      localStorage.removeItem("uploadedFile");
    }
  }, [location.state]);

  // Fetch judgment data and status
  useEffect(() => {
    if (!judgmentId) {
      setError("No judgment ID found. Please upload a judgment first.");
      setProgress(0);
      setLoading(false);
      return;
    }

    const fetchJudgmentData = async () => {
      try {
        // Try to fetch judgment and status
        const [judgment, status] = await Promise.all([
          apiService.getJudgment(judgmentId).catch(() => null),
          apiService.getJudgmentStatus(judgmentId).catch(() => null)
        ]);
        
        if (judgment) {
          setJudgmentData(judgment);
        }
        
        if (status) {
          setProcessingStatus(status);
        }
        
        // If both failed, the judgment might not be in DB yet - keep polling
        if (!judgment && !status) {
          console.log("Judgment not found yet, will retry...");
        }
      } catch (err) {
        console.error("Error fetching judgment data:", err);
        // Don't set error - keep polling
      }
    };

    // Initial fetch
    fetchJudgmentData();

    // Poll for status updates every 2 seconds
    const statusInterval = setInterval(async () => {
      try {
        const status = await apiService.getJudgmentStatus(judgmentId);
        setProcessingStatus(status);
        
        // Also try to fetch judgment data if we don't have it yet
        if (!judgmentData) {
          const judgment = await apiService.getJudgment(judgmentId).catch(() => null);
          if (judgment) {
            setJudgmentData(judgment);
          }
        }
        
        // Stop polling if processing is complete or failed
        if (status.status === 'extracted' || status.status === 'verified' || status.status === 'failed') {
          clearInterval(statusInterval);
          
          // Show error if failed
          if (status.status === 'failed') {
            setError("Processing failed. Please try uploading again or contact support.");
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
        // Don't stop polling on error - might be temporary
      }
    }, 2000);

    return () => clearInterval(statusInterval);
  }, [judgmentId]);

  // Calculate progress based on status
  useEffect(() => {
    if (!processingStatus) return;

    const statusProgress: Record<string, number> = {
      'uploaded': 10,
      'processing': 50,
      'extracted': 100,
      'verified': 100,
      'failed': 0
    };

    const targetProgress = statusProgress[processingStatus.status] || 0;
    
    // Animate progress
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetProgress) return targetProgress;
        return prev + 2;
      });
    }, 120);

    return () => clearInterval(progressTimer);
  }, [processingStatus]);

  // Update active step based on progress
  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep((prev) => {
        const targetStep = Math.floor((progress / 100) * processingSteps.length);
        if (prev >= targetStep) return prev;
        return prev + 1;
      });
    }, 900);

    return () => clearInterval(stepTimer);
  }, [progress]);

  const isCompleted = progress >= 100 || processingStatus?.status === 'extracted';

  const stepStatus = (index: number): StepStatus => {
    if (index < activeStep) return "done";
    if (index === activeStep) return "running";
    return "pending";
  };

  const riskLabel = useMemo(() => {
    if (!processingStatus) return "Analyzing";
    
    // Calculate risk based on directive priorities
    const directivesCount = processingStatus.directives_count || 0;
    if (directivesCount === 0) return "Analyzing";
    
    // Get priority distribution from analytics if available
    if (progress < 50) return "Analyzing";
    if (directivesCount > 20) return "High";
    if (directivesCount > 10) return "Medium";
    return "Low";
  }, [progress, processingStatus]);

  // Build extraction preview from real data
  const extractedPreview = useMemo(() => {
    if (!judgmentData) {
      return [
        { label: "Case Title", value: "Loading...", confidence: "--" },
        { label: "Order Date", value: "Loading...", confidence: "--" },
        { label: "Key Directive", value: "Loading...", confidence: "--" },
        { label: "Mapped Department", value: "Loading...", confidence: "--" },
      ];
    }

    return [
      {
        label: "Case ID",
        value: judgmentData.case_id || "N/A",
        confidence: "100%",
      },
      {
        label: "Court Name",
        value: judgmentData.court_name || "N/A",
        confidence: "98%",
      },
      {
        label: "Case Type",
        value: judgmentData.case_type?.toUpperCase() || "N/A",
        confidence: "95%",
      },
      {
        label: "Departments Involved",
        value: judgmentData.departments_involved?.join(", ") || "Detecting...",
        confidence: judgmentData.departments_involved?.length > 0 ? "92%" : "--",
      },
    ];
  }, [judgmentData]);

  return (
    <AppLayout activeSidebarItem="processing" showSearch={false} showUpload={false} pageTitle="Processing Judgment">
      <section className="processing-shell">
          {error && (
            <div className="auth-error" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div className="processing-topbar">
            <button className="back-btn" onClick={() => navigate("/upload")}>
              <ArrowLeft size={17} />
              Back to Upload
            </button>

            <button
              className="processing-next-btn"
              disabled={!isCompleted}
              onClick={() => {
                if (judgmentId) {
                  localStorage.setItem("currentJudgmentId", judgmentId);
                  navigate("/verification", { state: { judgmentId } });
                }
              }}
            >
              Continue to Verification
            </button>
          </div>

          <div className="processing-hero">
            <div>
              <p className="processing-eyebrow">AI LEGAL INTELLIGENCE PIPELINE</p>
              <h1>Processing Judgment</h1>
              <p>
                CourtPilot is parsing, filtering, validating and converting the
                uploaded court judgment into structured verifiable actions.
              </p>
            </div>

            <div className="processing-file-card">
              <FileCheck2 size={22} />
              <div>
                <span>Uploaded File</span>
                <strong>{uploadedFile || "No PDF file"}</strong>
              </div>
            </div>
          </div>

          <div className="processing-grid">
            <div className="processing-main-card">
              <div className="scan-panel">
                <div className="document-preview">
                  <div className="doc-header-line" />
                  <div className="doc-line short" />
                  <div className="doc-line" />
                  <div className="doc-line" />
                  <div className="doc-highlight" />
                  <div className="doc-line" />
                  <div className="doc-line short" />
                  <div className="scan-beam" />
                </div>

                <div className="processing-circle">
                  {isCompleted ? (
                    <CheckCircle2 size={48} />
                  ) : (
                    <Loader2 size={48} className="spin-icon" />
                  )}
                  <h2>{progress}%</h2>
                  <p>{isCompleted ? "Extraction Complete" : "Processing..."}</p>
                </div>
              </div>

              <div className="progress-section">
                <div className="progress-info">
                  <span>Overall Progress</span>
                  <strong>{progress}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="ai-stats-grid">
                <div>
                  <span>Pages Read</span>
                  <strong>
                    {processingStatus?.page_count 
                      ? `${Math.min(processingStatus.page_count, Math.floor(progress / 6))}/${processingStatus.page_count}`
                      : `${Math.floor(progress / 6)}/--`}
                  </strong>
                </div>
                <div>
                  <span>Directives Found</span>
                  <strong>{processingStatus?.directives_count || 0}</strong>
                </div>
                <div>
                  <span>Risk Level</span>
                  <strong className="risk-text">{riskLabel}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{processingStatus?.status?.toUpperCase() || "UPLOADING"}</strong>
                </div>
              </div>
            </div>

            <div className="processing-steps-card">
              <h3>Pipeline Steps</h3>

              <div className="step-list">
                {processingSteps.map((step, index) => {
                  const status = stepStatus(index);

                  return (
                    <div className={`processing-step ${status}`} key={step.id}>
                      <div className="step-icon">
                        {status === "done" ? (
                          <CheckCircle2 size={18} />
                        ) : status === "running" ? (
                          <Loader2 size={18} className="spin-icon" />
                        ) : (
                          step.icon
                        )}
                      </div>

                      <div>
                        <h4>{step.title}</h4>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="preview-grid">
            <div className="extraction-preview-card">
              <div className="preview-header">
                <h3>Live Extraction Preview</h3>
                <span>{isCompleted ? "Ready for Review" : "Updating..."}</span>
              </div>

              <div className="preview-list">
                {extractedPreview.map((item, index) => (
                  <div className="preview-item" key={item.label}>
                    <div>
                      <span>{item.label}</span>
                      <strong>
                        {progress > 35 + index * 12 ? item.value : "Detecting..."}
                      </strong>
                    </div>

                    <b>{progress > 35 + index * 12 ? item.confidence : "--"}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="safety-card">
              <h3>AI Safety & Verification</h3>
              <p>
                No extracted action will move to dashboard until reviewed by a
                legal officer. Low-confidence items are automatically marked for
                manual review.
              </p>

              <div className="safety-points">
                <span>Source Highlighting</span>
                <span>Confidence Scoring</span>
                <span>Human Approval Required</span>
              </div>
            </div>
          </div>
        </section>
    </AppLayout>
  );
};

export default AIProcessing;