import { useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSearch,
  FileText,
  Loader2,
  ScanText,
  Sparkles,
} from "lucide-react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";

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
    icon: <ScanText size={18} />,
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

const extractedPreview = [
  {
    label: "Case Title",
    value: "ABC Welfare Association vs State Government",
    confidence: "96%",
  },
  {
    label: "Order Date",
    value: "12 May 2026",
    confidence: "94%",
  },
  {
    label: "Key Directive",
    value: "Submit compliance report within 30 days",
    confidence: "91%",
  },
  {
    label: "Mapped Department",
    value: "Home Department",
    confidence: "87%",
  },
];

const AIProcessing = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(8);

  const uploadedFile = localStorage.getItem("uploadedFile") || "judgment.pdf";

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 120);

    const stepTimer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= processingSteps.length) return prev;
        return prev + 1;
      });
    }, 900);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, []);

  const isCompleted = progress >= 100 || activeStep >= processingSteps.length;

  const stepStatus = (index: number): StepStatus => {
    if (index < activeStep) return "done";
    if (index === activeStep) return "running";
    return "pending";
  };

  const riskLabel = useMemo(() => {
    if (progress < 40) return "Analyzing";
    if (progress < 75) return "Medium";
    return "High";
  }, [progress]);

  return (
    <AppLayout activeSidebarItem="processing" showSearch={false} showUpload={false} pageTitle="Processing Judgment">
      <section className="processing-shell">
          <div className="processing-topbar">
            <button className="back-btn" onClick={() => navigate("/upload")}>
              <ArrowLeft size={17} />
              Back to Upload
            </button>

            <button
              className="processing-next-btn"
              disabled={!isCompleted}
              onClick={() => navigate("/verification")}
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
                <strong>{uploadedFile}</strong>
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
                  <strong>{Math.min(18, Math.floor(progress / 6))}/18</strong>
                </div>
                <div>
                  <span>Directives Found</span>
                  <strong>{progress > 55 ? 7 : progress > 30 ? 3 : 0}</strong>
                </div>
                <div>
                  <span>Risk Level</span>
                  <strong className="risk-text">{riskLabel}</strong>
                </div>
                <div>
                  <span>Avg Confidence</span>
                  <strong>{progress > 80 ? "92%" : "Analyzing"}</strong>
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