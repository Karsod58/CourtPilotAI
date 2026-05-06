import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  FileText,
  XCircle,
  Upload,
  Sparkles
} from "lucide-react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import MockPDFViewer from "../components/MockPDFViewer";
import { legalTextAnalyzer, type TextHighlight, type ExtractedField } from "../utils/legalTextAnalyzer";
import { apiService, type Directive } from "../services/apiService";

const initialFields = {
  caseTitle: "",
  caseNumber: "",
  orderDate: "",
  petitioner: "",
  respondent: "",
  directive: "",
  department: "",
  deadline: "",
};

const Verification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fields, setFields] = useState(initialFields);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<"review" | "approved" | "rejected">("review");
  const [pdfFile, setPdfFile] = useState<File | string>("");
  const [highlights, setHighlights] = useState<TextHighlight[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedField[]>([]);
  const [selectedHighlight, setSelectedHighlight] = useState<TextHighlight | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [currentDirectiveIndex, setCurrentDirectiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avgConfidence, setAvgConfidence] = useState(0);
  const [judgmentData, setJudgmentData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get judgment ID from location state ONLY (don't use localStorage for initial load)
  const judgmentId = location.state?.judgmentId;

  // Load directives for specific judgment
  useEffect(() => {
    if (judgmentId) {
      loadJudgmentDirectives(judgmentId);
    } else {
      // If no judgment ID provided, show error
      setError("No judgment selected. Please upload and process a judgment first.");
      setLoading(false);
    }
  }, [judgmentId]);

  const loadJudgmentDirectives = async (judgmentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Load judgment data
      const judgment = await apiService.getJudgment(judgmentId);
      setJudgmentData(judgment);
      
      // Set PDF file path if available
      if (judgment.document_path) {
        setPdfFile(judgment.document_path);
      }
      
      // Load directives for this judgment
      const response = await apiService.getJudgmentDirectives(judgmentId);
      
      if (response && response.items && response.items.length > 0) {
        // Filter only pending directives
        const pendingDirectives = response.items.filter((d: Directive) => 
          d.verification_status === 'pending' || !d.verification_status
        );
        
        if (pendingDirectives.length > 0) {
          setDirectives(pendingDirectives);
          loadDirectiveData(pendingDirectives[0], judgment);
          
          // Calculate average confidence
          const totalConfidence = pendingDirectives.reduce((sum: number, d: Directive) => sum + (d.confidence_score * 100), 0);
          setAvgConfidence(Math.round(totalConfidence / pendingDirectives.length));
        } else {
          setError("All directives have been verified for this judgment");
        }
      } else {
        setError("No directives found for this judgment");
      }
    } catch (err) {
      console.error('Error loading judgment directives:', err);
      setError("Failed to load directives. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadPendingDirectives = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getPendingDirectives();
      
      if (response && response.items && response.items.length > 0) {
        setDirectives(response.items);
        loadDirectiveData(response.items[0], null);
        
        // Calculate average confidence
        const totalConfidence = response.items.reduce((sum, d) => sum + (d.confidence_score * 100), 0);
        setAvgConfidence(Math.round(totalConfidence / response.items.length));
      } else {
        setError("No pending directives found for verification");
      }
    } catch (err) {
      console.error('Error loading directives:', err);
      setError("Failed to load pending directives. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadDirectiveData = (directive: Directive, judgment: any) => {
    setFields({
      caseTitle: judgment ? `${judgment.case_id} - ${judgment.court_name}` : directive.judgment_id,
      caseNumber: judgment ? judgment.case_id : directive.judgment_id,
      orderDate: judgment && judgment.judgment_date 
        ? new Date(judgment.judgment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      petitioner: judgment ? judgment.petitioner || "" : "",
      respondent: judgment ? judgment.respondent || "" : "",
      directive: directive.directive_text,
      department: directive.assigned_department || directive.responsible_entity || "",
      deadline: directive.deadline || directive.deadline_text || "",
    });
  };

  const processDocument = useCallback(async (fileName: string) => {
    setIsProcessing(true);
    
    try {
      // Simulate document processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock text extraction (in real app, this would extract from PDF)
      const mockText = `
        HIGH COURT OF KARNATAKA
        Case No. HC/2024/1234 — ABC Welfare Association vs State Government
        The respondent authority is directed to submit a compliance report within 30 days from the date of this order.
        The concerned department shall ensure timely action and place the report before the competent authority.
        Matter relates to Home Department and requires immediate administrative follow-up.
        The petitioner has approached this Hon'ble Court seeking appropriate directions regarding pending administrative compliance.
        This order is passed on 12 May 2026 and must be complied with forthwith.
      `;
      
      // Analyze text and extract highlights
      const extractedHighlights = legalTextAnalyzer.analyzeText(mockText, 1);
      const extractedFields = legalTextAnalyzer.extractFields(mockText);
      
      setHighlights(extractedHighlights);
      setExtractedData(extractedFields);
      
      // Update fields with extracted data
      const updatedFields = { ...fields };
      extractedFields.forEach(field => {
        const key = field.label.toLowerCase().replace(/\s+/g, '') as keyof typeof fields;
        if (key in updatedFields) {
          updatedFields[key] = field.value;
        }
      });
      setFields(updatedFields);
      
    } catch (error) {
      console.error('Error processing document:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [fields]);

  
  const handleHighlightClick = useCallback((highlight: TextHighlight) => {
    setSelectedHighlight(highlight);
    
    // Update corresponding field if this highlight has an extractedField
    if (highlight.extractedField) {
      const key = highlight.extractedField as keyof typeof fields;
      if (key in fields) {
        setFields(prev => ({ ...prev, [key]: highlight.text }));
      }
    }
  }, [fields]);

  const handleChange = (key: keyof typeof fields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleApprove = async () => {
    if (directives.length === 0 || !directives[currentDirectiveIndex]) return;
    if (isSubmitting) return; // Prevent double-clicks
    
    try {
      setIsSubmitting(true);
      setError(null);
      const currentDirective = directives[currentDirectiveIndex];
      
      // Update directive with any edits
      await apiService.verifyDirective(
        currentDirective.id,
        true,
        "Approved by user",
        isEditing ? fields : undefined
      );
      
      // Save verified case data for action plan
      const verifiedCaseData = {
        caseTitle: fields.caseTitle,
        caseNumber: fields.caseNumber,
        orderDate: fields.orderDate,
        petitioner: fields.petitioner,
        respondent: fields.respondent,
        directive: fields.directive,
        department: fields.department,
        deadline: fields.deadline,
        judgmentId: currentDirective.judgment_id
      };
      localStorage.setItem("verifiedCase", JSON.stringify(verifiedCaseData));
      
      setStatus("approved");
      
      // Wait for user to see the success message
      setTimeout(async () => {
        // Remove the verified directive from the list
        const updatedDirectives = directives.filter((_, index) => index !== currentDirectiveIndex);
        setDirectives(updatedDirectives);
        
        // Check if there are more directives
        if (updatedDirectives.length > 0) {
          // Stay at same index (which now shows the next directive)
          const nextIndex = Math.min(currentDirectiveIndex, updatedDirectives.length - 1);
          setCurrentDirectiveIndex(nextIndex);
          loadDirectiveData(updatedDirectives[nextIndex], judgmentData);
          setStatus("review");
          setIsEditing(false);
          setIsSubmitting(false);
        } else {
          // All directives verified - navigate to action plan
          navigate("/action-plan");
        }
      }, 1500);
    } catch (err) {
      console.error('Error approving directive:', err);
      setError("Failed to approve directive. Please try again.");
      setStatus("review");
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (directives.length === 0 || !directives[currentDirectiveIndex]) return;
    if (isSubmitting) return; // Prevent double-clicks
    
    try {
      setIsSubmitting(true);
      setError(null);
      const currentDirective = directives[currentDirectiveIndex];
      
      await apiService.verifyDirective(
        currentDirective.id,
        false,
        "Rejected by user - incorrect extraction"
      );
      
      setStatus("rejected");
      
      // Wait for user to see the rejection message
      setTimeout(async () => {
        // Remove the rejected directive from the list
        const updatedDirectives = directives.filter((_, index) => index !== currentDirectiveIndex);
        setDirectives(updatedDirectives);
        
        // Check if there are more directives
        if (updatedDirectives.length > 0) {
          // Stay at same index (which now shows the next directive)
          const nextIndex = Math.min(currentDirectiveIndex, updatedDirectives.length - 1);
          setCurrentDirectiveIndex(nextIndex);
          loadDirectiveData(updatedDirectives[nextIndex], judgmentData);
          setStatus("review");
          setIsEditing(false);
          setIsSubmitting(false);
        } else {
          // All directives processed - navigate to dashboard
          navigate("/dashboard");
        }
      }, 1500);
    } catch (err) {
      console.error('Error rejecting directive:', err);
      setError("Failed to reject directive. Please try again.");
      setStatus("review");
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout activeSidebarItem="verified-actions" showSearch={false} showUpload={false} pageTitle="Verify Extracted Judgment Data">
      <section className="verification-shell">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading pending directives...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertTriangle size={48} />
              <h3>No Judgment Selected</h3>
              <p>{error}</p>
              <button onClick={() => navigate("/upload")}>Upload Judgment</button>
            </div>
          ) : directives.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={48} />
              <h3>No Pending Directives</h3>
              <p>All directives have been verified!</p>
              <button onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
            </div>
          ) : (
            <>
          <div className="verification-topbar">
            <button className="back-btn" onClick={() => navigate("/processing")}>
              <ArrowLeft size={17} />
              Back to Processing
            </button>

            <div className="verification-progress">
              Directive {currentDirectiveIndex + 1} of {directives.length}
            </div>

            <div className={`verification-status ${status}`}>
              {status === "review" && "Needs Human Review"}
              {status === "approved" && "Approved"}
              {status === "rejected" && "Rejected"}
            </div>
          </div>

          <div className="verification-header">
            <div>
              <p className="verification-eyebrow">HUMAN-IN-THE-LOOP REVIEW</p>
              <h1>Verify Extracted Judgment Data</h1>
              <p>
                Review AI-extracted fields with source highlights before moving
                the case to action plan generation.
              </p>
            </div>

            <div className="confidence-card">
              <span>Average Confidence</span>
              <strong>{avgConfidence}%</strong>
              <p>Low-confidence fields require manual attention.</p>
            </div>
          </div>

          <div className="verification-grid">
            {/* LEFT PDF VIEWER */}
            <div className="pdf-review-panel">
              {pdfFile ? (
                <>
                  <MockPDFViewer
                    fileName={pdfFile as string}
                  />
                  
                  {selectedHighlight && (
                    <div className="highlight-info-card">
                      <div className="highlight-info-header">
                        <Sparkles size={16} />
                        <span>Selected Highlight</span>
                      </div>
                      <div className="highlight-details">
                        <p><strong>Text:</strong> {selectedHighlight.text}</p>
                        <p><strong>Type:</strong> {selectedHighlight.type}</p>
                        <p><strong>Confidence:</strong> {selectedHighlight.confidence}%</p>
                        {selectedHighlight.reason && (
                          <p><strong>Reason:</strong> {selectedHighlight.reason}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="pdf-upload-prompt">
                  <Upload size={48} />
                  <h3>No PDF Loaded</h3>
                  <p>Please upload a PDF document from the upload screen to begin verification.</p>
                  <button onClick={() => navigate("/upload")}>
                    Go to Upload
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT EXTRACTED DATA */}
            <div className="extracted-panel">
              <div className="extracted-header">
                <div>
                  <h2>Extracted Insights</h2>
                  <p>Review, edit, approve or reject AI outputs.</p>
                  {isProcessing && (
                    <span className="processing-indicator">
                      Processing document...
                    </span>
                  )}
                </div>

                <button
                  className="edit-toggle"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={isProcessing}
                >
                  <Edit3 size={15} />
                  {isEditing ? "Stop Edit" : "Edit"}
                </button>
              </div>

              {/* Show extracted data confidence scores */}
              {extractedData.length > 0 && (
                <div className="extraction-summary">
                  <h4>AI Extraction Summary</h4>
                  <div className="summary-stats">
                    <div>
                      <span>Total Fields</span>
                      <strong>{extractedData.length}</strong>
                    </div>
                    <div>
                      <span>Avg Confidence</span>
                      <strong>
                        {Math.round(
                          extractedData.reduce((sum, field) => sum + field.confidence, 0) / extractedData.length
                        )}%
                      </strong>
                    </div>
                    <div>
                      <span>Highlights</span>
                      <strong>{highlights.length}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="field-list">
                {Object.entries(fields).map(([key, value]) => {
                  const currentDirective = directives[currentDirectiveIndex];
                  const confidence = currentDirective ? Math.round(currentDirective.confidence_score * 100) : 92;
                  
                  return (
                  <div className="verify-field" key={key}>
                    <div className="field-label-row">
                      <label>{formatLabel(key)}</label>
                      <span>{confidence}%</span>
                    </div>

                    {isEditing ? (
                      <input
                        value={value}
                        onChange={(e) =>
                          handleChange(
                            key as keyof typeof fields,
                            e.target.value
                          )
                        }
                      />
                    ) : (
                      <p>{value || "N/A"}</p>
                    )}
                  </div>
                  );
                })}
              </div>

              <div className="verification-actions">
                <button 
                  className="reject-btn" 
                  onClick={handleReject}
                  disabled={isSubmitting || status !== "review"}
                >
                  <XCircle size={17} />
                  {isSubmitting && status === "rejected" ? "Rejecting..." : "Reject"}
                </button>

                <button
                  className="approve-btn"
                  onClick={handleApprove}
                  disabled={isSubmitting || status !== "review"}
                >
                  <CheckCircle2 size={17} />
                  {isSubmitting && status === "approved" ? "Approving..." : "Approve & Continue"}
                </button>
              </div>

              {error && (
                <div className="error-box" style={{ 
                  padding: '12px', 
                  background: '#fee', 
                  border: '1px solid #fcc', 
                  borderRadius: '6px',
                  color: '#c33',
                  marginTop: '12px'
                }}>
                  <AlertTriangle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  {error}
                </div>
              )}

              {status === "approved" && (
                <div className="approved-box">
                  <CheckCircle2 size={18} />
                  Data verified successfully. This record can now move to Action
                  Plan generation.
                </div>
              )}

              {status === "rejected" && (
                <div className="rejected-box">
                  <XCircle size={18} />
                  Record rejected. Please reprocess or manually correct the
                  extraction.
                </div>
              )}
            </div>
          </div>
          </>
          )}
        </section>
    </AppLayout>
  );
};

const formatLabel = (key: string) => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
};

export default Verification;