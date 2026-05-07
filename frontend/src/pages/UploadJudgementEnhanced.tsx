import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Upload,
  FileText,
  X,
  AlertCircle,
  Loader2
} from "lucide-react";
import "./UploadJudgement.css";
import AppLayout from "../components/layout/AppLayout";
import { apiService } from "../services/apiService";

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const UploadJudgementEnhanced = () => {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [formData, setFormData] = useState({
    caseId: "",
    caseType: "",
    department: "",
    court: "High Court of Karnataka",
    judgeName: "",
    judgmentDate: "",
    petitioner: "",
    respondent: "",
    notes: ""
  });
  const [dragActive, setDragActive] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
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
    
    // Auto-extract metadata from PDF
    await extractMetadata(selectedFile);
  };

  const extractMetadata = async (file: File) => {
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Calling preview endpoint...');
      const response = await fetch(`${API_BASE_URL}/judgments/preview`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Preview response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview failed:', errorText);
        throw new Error('Failed to extract metadata');
      }
      
      const data = await response.json();
      console.log('Extracted data:', data);
      
      if (data.success && data.extracted_info) {
        const extracted = data.extracted_info;
        
        // Auto-fill form fields
        setFormData(prev => ({
          ...prev,
          caseId: extracted.case_id || prev.caseId,
          court: extracted.court_name || prev.court,
          petitioner: extracted.petitioner || prev.petitioner,
          respondent: extracted.respondent || prev.respondent,
          judgmentDate: extracted.judgment_date || prev.judgmentDate,
        }));
        
        setAutoFilled(true);
        console.log('Auto-filled from PDF:', extracted);
        
        // Check if this file already exists
        if (data.file_hash) {
          checkDuplicate(data.file_hash);
        }
      } else {
        console.warn('No extracted info in response:', data);
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
      // Don't show error to user - auto-fill is optional
    } finally {
      setExtracting(false);
    }
  };
          respondent: extracted.respondent || prev.respondent,
          judgmentDate: extracted.judgment_date || prev.judgmentDate,
        }));
        
        setAutoFilled(true);
        console.log('Auto-filled from PDF:', extracted);
        
        // Check if this file already exists
        if (data.file_hash) {
          checkDuplicate(data.file_hash);
        }
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
      // Don't show error to user - auto-fill is optional
    } finally {
      setExtracting(false);
    }
  };

  const checkDuplicate = async (fileHash: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/judgments/check-duplicate/${fileHash}`);
      
      if (!response.ok) {
        return; // Silently fail - not critical
      }
      
      const data = await response.json();
      
      if (data.exists && data.judgment) {
        const judgment = data.judgment;
        setErrors({ 
          file: `This file was already uploaded (Case ID: ${judgment.case_id}, Status: ${judgment.status}). Please select a different file or view the existing judgment.` 
        });
      }
    } catch (error) {
      console.error('Error checking duplicate:', error);
      // Silently fail - not critical
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleUpload = async () => {
    // Validation - only case_type is required now
    const newErrors: {[key: string]: string} = {};
    if (!file) newErrors.file = "Please select a file to upload";
    if (!formData.caseType) newErrors.caseType = "Please select a case type";
    
    // Warn if case ID is missing (but allow upload for auto-extraction)
    if (!formData.caseId) {
      console.log("Case ID will be auto-extracted from PDF");
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setProcessing(true);
    setErrors({});
    
    try {
      // Simulate upload progress
      setUploadProgress(10);
      
      // Map case type to backend format
      const caseTypeMap: {[key: string]: string} = {
        'writ': 'writ_petition',
        'civil': 'civil_appeal',
        'service': 'service_matter',
        'pension': 'pension_matter'
      };

      // Upload to backend with optional fields
      const judgment = await apiService.uploadJudgment(file!, {
        case_id: formData.caseId || undefined,  // Optional - will auto-extract if missing
        case_type: caseTypeMap[formData.caseType] || formData.caseType,
        court_name: formData.court || undefined,  // Optional - will auto-extract if missing
        judge_name: formData.judgeName || undefined,
        judgment_date: formData.judgmentDate || undefined,
        petitioner: formData.petitioner || undefined,
        respondent: formData.respondent || undefined,
      });

      setUploadProgress(50);

      // Store judgment ID for processing page
      localStorage.setItem("currentJudgmentId", judgment.id);
      localStorage.setItem("uploadedFile", fileName);
      localStorage.setItem("uploadMetadata", JSON.stringify({
        ...formData,
        judgmentId: judgment.id
      }));

      setUploadProgress(100);

      // Navigate to processing page with judgment ID
      setTimeout(() => {
        navigate("/processing", {
          state: {
            judgmentId: judgment.id,
            fileName: fileName
          }
        });
      }, 500);

    } catch (error: any) {
      console.error("Upload error:", error);
      
      // Handle specific error types
      let errorMessage = "Failed to upload judgment. Please try again.";
      
      if (error.message) {
        // Check for duplicate file error (409 Conflict)
        if (error.message.includes("already been uploaded") || 
            error.message.includes("Duplicate") ||
            error.message.includes("document_hash") ||
            error.message.toLowerCase().includes("conflict")) {
          errorMessage = "⚠️ This PDF file has already been uploaded. Please select a different file or check your existing judgments in the Cases page.";
        } else if (error.message.includes("409")) {
          errorMessage = "⚠️ This file already exists in the system. Please check the Cases page to view existing judgments.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setErrors({ upload: errorMessage });
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
                    setFile(null);
                    setFileName("");
                    setAutoFilled(false);
                  }}>Remove</button>
                </div>
              )}

              {extracting && (
                <div className="extraction-notice" style={{ 
                  padding: '12px', 
                  background: '#f0f9ff', 
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#0369a1'
                }}>
                  <Loader2 size={16} className="spin-icon" />
                  Extracting metadata from PDF...
                </div>
              )}

              {autoFilled && !extracting && (
                <div className="extraction-notice" style={{ 
                  padding: '12px', 
                  background: '#f0fdf4', 
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#15803d'
                }}>
                  <CheckCircle2 size={16} />
                  Fields auto-filled from PDF. You can edit them if needed.
                </div>
              )}

              <div className="upload-form-grid">
                <div className="form-control">
                  <label>Case ID {autoFilled && <span style={{color: '#15803d', fontSize: '12px'}}>(Auto-filled)</span>}</label>
                  <input 
                    placeholder="e.g., WP(C) No.13264/2026 (will auto-extract if empty)"
                    value={formData.caseId}
                    onChange={(e) => handleInputChange('caseId', e.target.value)}
                    className={errors.caseId ? 'error' : ''}
                    disabled={processing || extracting}
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
                    <option value="writ">Writ Petition</option>
                    <option value="civil">Civil Appeal</option>
                    <option value="service">Service Matter</option>
                    <option value="pension">Pension Matter</option>
                  </select>
                  {errors.caseType && (
                    <div className="field-error">
                      <AlertCircle size={12} />
                      {errors.caseType}
                    </div>
                  )}
                </div>

                <div className="form-control full">
                  <label>Court {autoFilled && <span style={{color: '#15803d', fontSize: '12px'}}>(Auto-filled)</span>}</label>
                  <input 
                    value={formData.court}
                    onChange={(e) => handleInputChange('court', e.target.value)}
                    className={errors.court ? 'error' : ''}
                    disabled={processing || extracting}
                    placeholder="Will auto-extract if empty"
                  />
                  {errors.court && (
                    <div className="field-error">
                      <AlertCircle size={12} />
                      {errors.court}
                    </div>
                  )}
                </div>

                <div className="form-control">
                  <label>Judge Name (Optional)</label>
                  <input 
                    placeholder="e.g., Justice Vibhu Bakhru"
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
                    placeholder="e.g., T.C. Devaraju"
                    value={formData.petitioner}
                    onChange={(e) => handleInputChange('petitioner', e.target.value)}
                    disabled={processing}
                  />
                </div>

                <div className="form-control">
                  <label>Respondent (Optional)</label>
                  <input 
                    placeholder="e.g., State of Karnataka"
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
                <div className="error-message" style={{ marginTop: '1rem' }}>
                  <AlertCircle size={14} />
                  {errors.upload}
                </div>
              )}

              <div className="upload-action-row">
                <button className="cancel-upload" onClick={() => navigate("/")}>
                  Cancel
                </button>

                <button
                  className="process-upload"
                  disabled={!file || processing}
                  onClick={handleUpload}
                >
                  {processing ? "Uploading..." : "Upload & Process"}
                </button>
              </div>

              {processing && (
                <div className="ai-processing-card">
                  <div className="progress-spinner" />
                  <div className="progress-content">
                    <h4>Uploading to CourtPilot AI</h4>
                    <p>
                      Uploading judgment to backend for OCR, text extraction, and AI analysis...
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
                  <h4>Backend Connected</h4>
                  <span className="status-indicator">
                    <span className="status-dot"></span>
                    API Active
                  </span>
                </div>

                <div className="recent-row">
                  <span>✓ FastAPI Backend</span>
                  <b>Running</b>
                </div>

                <div className="recent-row">
                  <span>✓ Ollama AI (gemma3:12b)</span>
                  <b>Ready</b>
                </div>
              </div>
            </div>
          </div>
        </section>
    </AppLayout>
  );
};

export default UploadJudgementEnhanced;
