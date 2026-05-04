import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  FileText,
  X,
  AlertCircle
} from "lucide-react";
import "./UploadJudgement.css";
import AppLayout from "../components/layout/AppLayout";

const UploadJudgement = () => {
  const navigate = useNavigate();

  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [formData, setFormData] = useState({
    caseType: "",
    department: "",
    court: "High Court of Karnataka",
    notes: ""
  });
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (file.type !== "application/pdf") {
        setErrors({ file: "Please upload a PDF file only" });
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB
        setErrors({ file: "File size must be less than 50MB" });
        return;
      }
      setFileName(file.name);
      setErrors({});
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
      const file = e.dataTransfer.files[0];
      if (file.type !== "application/pdf") {
        setErrors({ file: "Please upload a PDF file only" });
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setErrors({ file: "File size must be less than 50MB" });
        return;
      }
      setFileName(file.name);
      setErrors({});
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
    if (!fileName) newErrors.file = "Please select a file to upload";
    if (!formData.caseType) newErrors.caseType = "Please select a case type";
    if (!formData.department) newErrors.department = "Please select a department";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setProcessing(true);
    setErrors({});
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    localStorage.setItem("uploadedFile", fileName);
    localStorage.setItem("uploadMetadata", JSON.stringify(formData));
    navigate("/processing");
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
                  <CloudUpload size={38} />
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
                  <button onClick={() => setFileName("")}>Remove</button>
                </div>
              )}

              <div className="upload-form-grid">
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

                <div className="form-control">
                  <label>Department *</label>
                  <select 
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className={errors.department ? 'error' : ''}
                    disabled={processing}
                  >
                    <option value="" disabled>
                      Select department
                    </option>
                    <option value="finance">Finance Department</option>
                    <option value="home">Home Department</option>
                    <option value="education">Education Department</option>
                    <option value="pwd">PWD</option>
                    <option value="social">Social Justice</option>
                  </select>
                  {errors.department && (
                    <div className="field-error">
                      <AlertCircle size={12} />
                      {errors.department}
                    </div>
                  )}
                </div>

                <div className="form-control full">
                  <label>Court</label>
                  <input 
                    value={formData.court}
                    onChange={(e) => handleInputChange('court', e.target.value)}
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
                  <span>Last 24 hrs</span>
                </div>

                <div className="recent-row">
                  <span>HC_2024_1456.pdf</span>
                  <b>Processed</b>
                </div>

                <div className="recent-row">
                  <span>Judgment_ABC_vs_State.pdf</span>
                  <b>Processed</b>
                </div>
              </div>
            </div>
          </div>
        </section>
    </AppLayout>
  );
};

export default UploadJudgement;