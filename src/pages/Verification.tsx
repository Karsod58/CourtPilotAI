import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

const initialFields = {
  caseTitle: "ABC Welfare Association vs State Government",
  caseNumber: "HC/2024/1234",
  orderDate: "12 May 2026",
  petitioner: "ABC Welfare Association",
  respondent: "State Government",
  directive: "Submit compliance report within 30 days",
  department: "Home Department",
  deadline: "11 June 2026",
};

const Verification = () => {
  const navigate = useNavigate();
  const [fields, setFields] = useState(initialFields);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<"review" | "approved" | "rejected">("review");
  const [pdfFile, setPdfFile] = useState<File | string>("");
  const [highlights, setHighlights] = useState<TextHighlight[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedField[]>([]);
  const [selectedHighlight, setSelectedHighlight] = useState<TextHighlight | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load PDF from localStorage on mount
  useEffect(() => {
    const uploadedFileName = localStorage.getItem("uploadedFile");
    const uploadMetadata = localStorage.getItem("uploadMetadata");
    
    if (uploadedFileName) {
      // In a real app, you'd have the actual file stored somewhere
      // For now, we'll use a mock PDF or the file name
      setPdfFile(uploadedFileName);
      
      // Process the document to extract highlights
      processDocument(uploadedFileName);
    }
    
    if (uploadMetadata) {
      try {
        const metadata = JSON.parse(uploadMetadata);
        // Update fields with metadata if available
        setFields(prev => ({ ...prev, ...metadata }));
      } catch (error) {
        console.error('Error parsing upload metadata:', error);
      }
    }
  }, []);

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

  const handleApprove = () => {
  setStatus("approved");
  localStorage.setItem("verifiedCase", JSON.stringify(fields));

  navigate("/action-plan");
};

  const handleReject = () => {
    setStatus("rejected");
  };

  return (
    <AppLayout activeSidebarItem="verified-actions" showSearch={false} showUpload={false} pageTitle="Verify Extracted Judgment Data">
      <section className="verification-shell">
          <div className="verification-topbar">
            <button className="back-btn" onClick={() => navigate("/processing")}>
              <ArrowLeft size={17} />
              Back to Processing
            </button>

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
              <strong>92%</strong>
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
                {Object.entries(fields).map(([key, value]) => (
                  <div className="verify-field" key={key}>
                    <div className="field-label-row">
                      <label>{formatLabel(key)}</label>
                      <span>92%</span>
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
                      <p>{value}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="verification-actions">
                <button className="reject-btn" onClick={handleReject}>
                  <XCircle size={17} />
                  Reject
                </button>

                <button
  className="approve-btn"
  onClick={handleApprove}
>
  <CheckCircle2 size={17} />
  Approve & Continue
</button>
              </div>

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