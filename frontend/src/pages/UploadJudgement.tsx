import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Upload,
  FileText,
  X,
  AlertCircle,
  Zap,
  Clock
} from "lucide-react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { apiService, type Judgment } from "../services/apiService";

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const UploadJudgement = () => {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [formData, setFormData] = useState({
    caseId: "",
    caseType: "",
    courtName: "High Court of Karnataka",
    judgeName: "",
    petitioner: "",
    respondent: "",
    judgmentDate: "",
    notes: ""
  });
  const [dragActive, setDragActive] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<any>(null);
  const [showExtracted, setShowExtracted] = useState(false);
  const [recentUploads, setRecentUploads] = useState<Judgment[]>([]);
  const [processingUpload, setProcessingUpload] = useState<string | null>(null);

  // Load recent uploads on component mount
  useState(() => {
    loadRecentUploads();
  });

  const loadRecentUploads = async () => {
    try {
      const response = await apiService.getJudgments(1, 5);
      setRecentUploads(response.items);
    } catch (error) {
      console.error('Error loading recent uploads:', error);
    }
  };

  const handleProcessUpload = async (judgmentId: string) => {
    try {
      setProcessingUpload(judgmentId);
      await apiService.processJudgment(judgmentId);
      // Reload recent uploads to update status
      await loadRecentUploads();
      // Navigate to processing page
      navigate("/processing", { 
        state: { 
          judgmentId: judgmentId
        } 
      });
    } catch (error) {
      console.error('Error processing judgment:', error);
      alert('Failed to start processing. Please try again.');
    } finally {
      setProcessingUpload(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type and size
      if (selectedFile.type !== "application/pdf") {
        setErrors({ file: "Please upload a PDF file only" });
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB
        setErrors({ file: "File size must be less than 50MB" });
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setErrors({});
      
      // Auto-extract information from PDF
      await extractPDFInfo(selectedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type !== "application/pdf") {
        setErrors({ file: "Please upload a PDF file only" });
        return;
      }
      if (droppedFile.size > 50 * 1024 * 1024) {
        setErrors({ file: "File size must be less than 50MB" });
        return;
      }
      setFile(droppedFile);
      setFileName(droppedFile.name);
      setErrors({});
      
      // Auto-extract information from PDF
      await extractPDFInfo(droppedFile);
    }
  };

  const extractPDFInfo = async (pdfFile: File) => {
    setExtracting(true);
    setExtractedInfo(null);
    setShowExtracted(false);
    
    try {
      // Upload with auto_extract flag to get OCR extraction
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('case_type', 'civil'); // Temporary
      formData.append('auto_extract', 'true');
      
      const response = await fetch(`${API_BASE_URL}/judgments/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Extract case metadata if available
        const metadata = result.case_metadata?.extracted_info || {};
        
        setExtractedInfo({
          case_id: metadata.case_id || result.case_id,
          court_name: metadata.court_name || result.court_name,
          petitioner: metadata.petitioner,
          respondent: metadata.respondent,
          judgment_date: metadata.judgment_date,
        });
        
        setShowExtracted(true);
        
        // Delete the temporary upload
        try {
          await fetch(`${API_BASE_URL}/judgments/${result.id}`, {
            method: 'DELETE',
          });
        } catch (e) {
          console.log('Could not delete temporary upload');
        }
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
    } finally {
      setExtracting(false);
    }
  };

  const applyExtractedInfo = () => {
    if (extractedInfo) {
      setFormData(prev => ({
        ...prev,
        caseId: extractedInfo.case_id || prev.caseId,
        courtName: extractedInfo.court_name || prev.courtName,
        petitioner: extractedInfo.petitioner || prev.petitioner,
        respondent: extractedInfo.respondent || prev.respondent,
        judgmentDate: extractedInfo.judgment_date || prev.judgmentDate,
      }));
      setShowExtracted(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleUpload = async () => {
    // Validation
    const newErrors: {[key: string]: string} = {};
    if (!file) newErrors.file = "Please select a file to upload";
    if (!formData.caseId) newErrors.caseId = "Please enter a case ID";
    if (!formData.caseType) newErrors.caseType = "Please select a case type";
    if (!formData.courtName) newErrors.courtName = "Please enter court name";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setProcessing(true);
    setErrors({});
    setUploadProgress(0);
    
    try {
      // Prepare metadata
      const metadata = {
        case_id: formData.caseId,
        case_type: formData.caseType,
        court_name: formData.courtName,
        judge_name: formData.judgeName || undefined,
        petitioner: formData.petitioner || undefined,
        respondent: formData.respondent || undefined,
        judgment_date: formData.judgmentDate || undefined,
      };

      // Simulate upload progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      // Upload to backend
      const result = await apiService.uploadJudgment(file!, metadata);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Store judgment ID and navigate to processing page
      localStorage.setItem("currentJudgmentId", result.id);
      localStorage.setItem("uploadedFile", fileName);
      
      // Trigger AI processing immediately
      try {
        await apiService.processJudgment(result.id);
      } catch (processError) {
        console.error("Processing trigger error:", processError);
        // Continue anyway - processing might already be running
      }
      
      // Wait a moment to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigate("/processing", { 
        state: { 
          judgmentId: result.id,
          fileName: fileName 
        } 
      });
      
    } catch (error: any) {
      console.error("Upload error:", error);
      setErrors({ upload: error.message || "Failed to upload judgment. Please try again." });
      setProcessing(false);
      setUploadProgress(0);
    }
  };

  return (
    <AppLayout activeSidebarItem="upload" showSearch={false} showUpload={false}>
      <section className="upload-page-shell">
          <div className="upload-topbar">
            <button className="back-btn" onClick={() => navigate("/")}>
              <ArrowLeft size={17} />
              Back to Dashboard
            </button>

            <button className="close-btn" onClick={() => navigate("/")}>
              <X size={18} />
            </button>
          </div>

          <div className="upload-hero-grid">
            <div className="upload-info-panel">
              <div className="upload-info-content">
                <p className="eyebrow">COURTPILOT AI</p>
                <h1>Upload Court Judgment</h1>
                <p className="hero-description">
                  Upload a scanned or digital court judgment PDF. CourtPilot
                  will extract case details, identify key directives, infer
                  timelines, map responsible departments, and prepare the record
                  for human verification.
                </p>

                <div className="benefit-grid">
                  <div className="benefit-card">
                    <CheckCircle2 size={18} />
                    <span>OCR + PDF Parsing</span>
                  </div>

                  <div className="benefit-card">
                    <CheckCircle2 size={18} />
                    <span>Directive Detection</span>
                  </div>

                  <div className="benefit-card">
                    <CheckCircle2 size={18} />
                    <span>Confidence Scores</span>
                  </div>

                  <div className="benefit-card">
                    <CheckCircle2 size={18} />
                    <span>Action Plan Ready</span>
                  </div>
                </div>

                <div className="pipeline-preview">
                  <div>Upload</div>
                  <span />
                  <div>Extract</div>
                  <span />
                  <div>Verify</div>
                  <span />
                  <div>Track</div>
                </div>
              </div>
            </div>

            <div className="upload-form-panel">
              <div className="panel-title-row">
                <div>
                  <h2>Upload Judgment</h2>
                  <p>PDF intake for AI processing</p>
                </div>
                <div className="secure-badge">Secure</div>
              </div>

              <label 
                className={`premium-dropzone ${dragActive ? 'drag-active' : ''} ${errors.file ? 'error' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={processing}
                />

                <div className="upload-cloud">
                  <Upload size={38} />
                </div>

                <h3>{dragActive ? 'Drop your PDF here' : 'Drag & drop PDF here'}</h3>
                <p>or click below to browse from your system</p>

                <span className="browse-btn">Browse Files</span>

                <small>Supported: PDF • Max size: 50MB</small>
                
                {errors.file && (
                  <div className="error-message">
                    <AlertCircle size={14} />
                    {errors.file}
                  </div>
                )}
              </label>

              {fileName && (
                <div className="selected-file-box">
                  <div>
                    <FileText size={18} />
                    <span>{fileName}</span>
                  </div>
                  <button onClick={() => {
                    setFileName("");
                    setFile(null);
                    setExtractedInfo(null);
                    setShowExtracted(false);
                  }}>Remove</button>
                </div>
              )}

              {extracting && (
                <div className="extraction-progress">
                  <div className="progress-spinner" />
                  <span>Extracting information from PDF...</span>
                </div>
              )}

              {showExtracted && extractedInfo && (
                <div className="extracted-info-card">
                  <div className="extracted-header">
                    <CheckCircle2 size={18} />
                    <h4>Auto-Extracted Information</h4>
                  </div>
                  <div className="extracted-fields">
                    {extractedInfo.case_id && (
                      <div className="extracted-field">
                        <label>Case ID:</label>
                        <span>{extractedInfo.case_id}</span>
                      </div>
                    )}
                    {extractedInfo.court_name && (
                      <div className="extracted-field">
                        <label>Court:</label>
                        <span>{extractedInfo.court_name}</span>
                      </div>
                    )}
                    {extractedInfo.petitioner && (
                      <div className="extracted-field">
                        <label>Petitioner:</label>
                        <span>{extractedInfo.petitioner}</span>
                      </div>
                    )}
                    {extractedInfo.respondent && (
                      <div className="extracted-field">
                        <label>Respondent:</label>
                        <span>{extractedInfo.respondent}</span>
                      </div>
                    )}
                    {extractedInfo.judgment_date && (
                      <div className="extracted-field">
                        <label>Date:</label>
                        <span>{extractedInfo.judgment_date}</span>
                      </div>
                    )}
                  </div>
                  <div className="extracted-actions">
                    <button 
                      className="apply-extracted-btn"
                      onClick={applyExtractedInfo}
                    >
                      <CheckCircle2 size={16} />
                      Auto-Fill Form
                    </button>
                    <button 
                      className="dismiss-extracted-btn"
                      onClick={() => setShowExtracted(false)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="upload-form-grid">
                <div className="form-control">
                  <label>Case ID *</label>
                  <input 
                    type="text"
                    placeholder="e.g., WP/12345/2026"
                    value={formData.caseId}
                    onChange={(e) => handleInputChange('caseId', e.target.value)}
                    className={errors.caseId ? 'error' : ''}
                    disabled={processing}
                  />
                  {errors.caseId && (
                    <div className="field-error">
                      <AlertCircle size={12} />
                      {errors.caseId}
                    </div>
                  )}
                </div>

                <div className="form-control">
                  <label>Case Type *</label>
                  <select 
                    value={formData.caseType}
                    onChange={(e) => handleInputChange('caseType', e.target.value)}
                    className={errors.caseType ? 'error' : ''}
                    disabled={processing}
                  >
                    <option value="" disabled>
                      Select case type
                    </option>
                    <option value="civil">Civil</option>
                    <option value="criminal">Criminal</option>
                    <option value="constitutional">Constitutional</option>
                    <option value="special">Special</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.caseType && (
                    <div className="field-error">
                      <AlertCircle size={12} />
                      {errors.caseType}
                    </div>
                  )}
                </div>

                <div className="form-control full">
                  <label>Court Name *</label>
                  <input 
                    type="text"
                    value={formData.courtName}
                    onChange={(e) => handleInputChange('courtName', e.target.value)}
                    className={errors.courtName ? 'error' : ''}
                    disabled={processing}
                  />
                  {errors.courtName && (
                    <div className="field-error">
                      <AlertCircle size={12} />
                      {errors.courtName}
                    </div>
                  )}
                </div>

                <div className="form-control">
                  <label>Judge Name (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g., Hon'ble Justice..."
                    value={formData.judgeName}
                    onChange={(e) => handleInputChange('judgeName', e.target.value)}
                    disabled={processing}
                  />
                </div>

                <div className="form-control">
                  <label>Judgment Date (Optional)</label>
                  <input 
                    type="date"
                    value={formData.judgmentDate}
                    onChange={(e) => handleInputChange('judgmentDate', e.target.value)}
                    disabled={processing}
                  />
                </div>

                <div className="form-control">
                  <label>Petitioner (Optional)</label>
                  <input 
                    type="text"
                    placeholder="Petitioner name"
                    value={formData.petitioner}
                    onChange={(e) => handleInputChange('petitioner', e.target.value)}
                    disabled={processing}
                  />
                </div>

                <div className="form-control">
                  <label>Respondent (Optional)</label>
                  <input 
                    type="text"
                    placeholder="Respondent name"
                    value={formData.respondent}
                    onChange={(e) => handleInputChange('respondent', e.target.value)}
                    disabled={processing}
                  />
                </div>

                <div className="form-control full">
                  <label>Notes (Optional)</label>
                  <textarea 
                    placeholder="Add context for reviewer..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    disabled={processing}
                  />
                </div>
              </div>

              {errors.upload && (
                <div className="error-message" style={{ marginTop: '10px' }}>
                  <AlertCircle size={14} />
                  {errors.upload}
                </div>
              )}

              {processing && uploadProgress > 0 && (
                <div className="upload-progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                  <span>{uploadProgress}%</span>
                </div>
              )}

              <div className="upload-action-row">
                <button className="cancel-upload" onClick={() => navigate("/")}>
                  Cancel
                </button>

                <button
                  className="process-upload"
                  disabled={!fileName || processing}
                  onClick={handleUpload}
                >
                  {processing ? "Processing..." : "Upload & Process"}
                </button>
              </div>

              {processing && (
                <div className="ai-processing-card">
                  <div className="progress-spinner" />
                  <div className="progress-content">
                    <h4>AI Processing Started</h4>
                    <p>
                      Running OCR, text cleaning, legal extraction and directive
                      filtering...
                    </p>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="progress-text">{uploadProgress}% Complete</span>
                  </div>
                </div>
              )}

              <div className="recent-upload-mini">
                <div className="recent-header">
                  <h4>Recent Uploads</h4>
                  <span>Last 5 uploads</span>
                </div>

                {recentUploads.length === 0 ? (
                  <div className="recent-row" style={{ justifyContent: 'center', color: '#6b7280' }}>
                    <span>No recent uploads</span>
                  </div>
                ) : (
                  recentUploads.map((upload) => (
                    <div className="recent-row" key={upload.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 500 }}>{upload.case_id}</span>
                        <small style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem' }}>
                          <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                          {formatDate(upload.uploaded_at)}
                        </small>
                      </div>
                      {upload.status === 'uploaded' ? (
                        <button
                          onClick={() => handleProcessUpload(upload.id)}
                          disabled={processingUpload === upload.id}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Zap size={12} />
                          {processingUpload === upload.id ? 'Processing...' : 'Process'}
                        </button>
                      ) : (
                        <b className={`status-badge ${upload.status.replace("_", "-").toLowerCase()}`}>
                          {upload.status.replace("_", " ")}
                        </b>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
    </AppLayout>
  );
};

export default UploadJudgement;