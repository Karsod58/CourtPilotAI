import {
  Check,
  Lock,
  FileCheck,
  Landmark,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import { useParams } from "react-router-dom";

// Icon mapping function
const getIcon = (iconType: string, size: number = 18) => {
  switch (iconType) {
    case "check":
      return <Check size={size} />;
    case "lock":
      return <Lock size={size} />;
    case "fileCheck":
      return <FileCheck size={size} />;
    case "landmark":
      return <Landmark size={size} />;
    default:
      return <Check size={size} />;
  }
};

// Dynamic stepper functions
const getCurrentStage = (steps: any[]) => {
  const activeStep = steps.find(step => step.status === "active");
  return activeStep ? activeStep.label : "Unknown";
};

const LifecycleTracking = () => {
  const { id } = useParams();
  const [lifecycleSteps, setLifecycleSteps] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [judgmentId, setJudgmentId] = useState<string | null>(null);

  const handleStepHover = (index: number) => {
    setHoveredStep(index);
    
    // Calculate tooltip position based on screen
    const stepElement = document.getElementById(`step-${index}`);
    if (stepElement) {
      const rect = stepElement.getBoundingClientRect();
      const tooltipWidth = 280; // Approximate tooltip width
      const screenWidth = window.innerWidth;
      const centerX = rect.left + rect.width / 2;
      
      // Position tooltip based on available space
      if (centerX - tooltipWidth / 2 < 0) {
        setTooltipPosition("left-edge");
      } else if (centerX + tooltipWidth / 2 > screenWidth) {
        setTooltipPosition("right-edge");
      } else {
        setTooltipPosition("center");
      }
    }
  };

  useEffect(() => {
    loadLifecycleData();
  }, [id]);

  const loadLifecycleData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Priority 1: Get judgment ID from URL params
      let targetJudgmentId = id;
      
      // Priority 2: Get from localStorage (last uploaded/clicked)
      if (!targetJudgmentId) {
        targetJudgmentId = localStorage.getItem("currentJudgmentId") || undefined;
      }
      
      // Priority 3: Get the most recent judgment
      if (!targetJudgmentId) {
        const judgments = await apiService.getJudgments(1, 1);
        if (judgments.items.length > 0) {
          targetJudgmentId = judgments.items[0].id;
          // Store it for future use
          localStorage.setItem("currentJudgmentId", targetJudgmentId);
        }
      }
      
      if (!targetJudgmentId) {
        throw new Error('No judgment found. Please upload a judgment first.');
      }
      
      setJudgmentId(targetJudgmentId);
      setJudgmentId(targetJudgmentId);
      
      // Load lifecycle and timeline data
      const [lifecycle, timeline] = await Promise.all([
        apiService.getLifecycleStatus(targetJudgmentId),
        apiService.getTimeline(targetJudgmentId)
      ]);
      
      // Transform lifecycle stages to steps format
      const stageOrder = ['uploaded', 'processed', 'verified', 'action_planned', 'in_progress', 'completed'];
      const stageLabels: Record<string, string> = {
        'uploaded': 'Judgment Uploaded',
        'processed': 'AI Processing',
        'verified': 'Verification',
        'action_planned': 'Action Plan Created',
        'in_progress': 'Implementation',
        'completed': 'Completed'
      };
      
      const stageIcons: Record<string, string> = {
        'uploaded': 'fileCheck',
        'processed': 'landmark',
        'verified': 'check',
        'action_planned': 'fileCheck',
        'in_progress': 'check',
        'completed': 'check'
      };
      
      const currentStageIndex = stageOrder.indexOf(lifecycle.current_stage);
      
      const steps = stageOrder.map((stageName, index) => {
        const stageData = lifecycle.stages[stageName];
        let status = 'pending';
        
        if (index < currentStageIndex) {
          status = 'completed';
        } else if (index === currentStageIndex) {
          status = 'active';
        }
        
        return {
          label: stageLabels[stageName],
          status,
          date: stageData?.date ? new Date(stageData.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }) : '-',
          time: stageData?.date ? new Date(stageData.date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
          }) : '-',
          description: stageData?.description || `${stageLabels[stageName]} stage`,
          details: [],
          iconType: stageIcons[stageName],
          icon: getIcon(stageIcons[stageName], stageIcons[stageName] === "lock" ? 17 : 18)
        };
      });
      
      setLifecycleSteps(steps);
      setCurrentStage(getCurrentStage(steps));
      
      // Transform timeline to activity logs
      const logs = timeline.timeline.map((event: any) => ({
        date: new Date(event.timestamp).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        text: event.description,
        user: event.user || 'System'
      }));
      
      setActivityLogs(logs);
    } catch (err) {
      console.error('Error loading lifecycle data:', err);
      setError('Failed to load lifecycle data');
      
      // Load fallback data
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackData = () => {
    // Fallback to static data if API fails
    const fallbackSteps = [
      {
        label: "Judgment Uploaded",
        status: "completed",
        date: "5 May 2026",
        time: "10:30 AM",
        description: "Judgment uploaded stage",
        details: [],
        iconType: "fileCheck",
        icon: getIcon("fileCheck", 18)
      },
      {
        label: "AI Processing",
        status: "completed",
        date: "5 May 2026",
        time: "10:35 AM",
        description: "AI Processing stage",
        details: [],
        iconType: "landmark",
        icon: getIcon("landmark", 18)
      },
      {
        label: "Verification",
        status: "active",
        date: "5 May 2026",
        time: "11:00 AM",
        description: "Verification stage",
        details: [],
        iconType: "check",
        icon: getIcon("check", 18)
      },
      {
        label: "Action Plan Created",
        status: "pending",
        date: "-",
        time: "-",
        description: "Action Plan Created stage",
        details: [],
        iconType: "fileCheck",
        icon: getIcon("fileCheck", 18)
      },
      {
        label: "Implementation",
        status: "pending",
        date: "-",
        time: "-",
        description: "Implementation stage",
        details: [],
        iconType: "check",
        icon: getIcon("check", 18)
      },
      {
        label: "Completed",
        status: "pending",
        date: "-",
        time: "-",
        description: "Completed stage",
        details: [],
        iconType: "check",
        icon: getIcon("check", 18)
      }
    ];
    
    setLifecycleSteps(fallbackSteps);
    setCurrentStage(getCurrentStage(fallbackSteps));
    setActivityLogs([
      {
        date: "5 May 2026",
        text: "Judgment uploaded to system",
        user: "Admin"
      }
    ]);
  };

  if (loading) {
    return (
      <AppLayout activeSidebarItem="lifecycle" showSearch={false} showUpload={false} pageTitle="Lifecycle Tracking">
        <div className="loading-state" style={{ textAlign: 'center', padding: '4rem' }}>
          <Loader2 size={48} className="spin-icon" style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          <p>Loading lifecycle data...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout activeSidebarItem="lifecycle" showSearch={false} showUpload={false} pageTitle="Lifecycle Tracking">
        <div className="error-state" style={{ textAlign: 'center', padding: '4rem' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
          <h3>Unable to Load Lifecycle</h3>
          <p>{error}</p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={loadLifecycleData} 
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
            <button 
              onClick={() => window.location.href = '/cases'} 
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: '#6b7280', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Back to Cases
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeSidebarItem="lifecycle" showSearch={false} showUpload={false} pageTitle="Lifecycle Tracking">
      <div className="lifecycle-card">
        <h2 className="lifecycle-title">LIFECYCLE TRACKING</h2>

        <div className="lifecycle-stepper">
          {lifecycleSteps.map((step, index) => (
            <div 
              id={`step-${index}`}
              className={`step-wrapper ${step.status}-step`} 
              key={step.label}
              onMouseEnter={() => handleStepHover(index)}
              onMouseLeave={() => {
                setHoveredStep(null);
                setTooltipPosition("");
              }}
            >
              {index !== lifecycleSteps.length - 1 && (
                <div
                  className={`step-line ${
                    step.status === "completed" || step.status === "active"
                      ? "line-active"
                      : ""
                  }`}
                />
              )}

              <div className={`step-circle ${step.status}`}>{step.icon}</div>

              <p className="step-label">{step.label}</p>

              <p className="step-date">{step.date}</p>
              <p className="step-time">{step.time}</p>

              {/* Tooltip */}
              {hoveredStep === index && (
                <div className={`step-tooltip ${tooltipPosition}`}>
                  <div className="tooltip-header">
                    <h4>{step.label}</h4>
                    <span className={`tooltip-status ${step.status}`}>
                      {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                    </span>
                  </div>
                  <p className="tooltip-description">{step.description}</p>
                  {step.details && step.details.length > 0 && (
                    <div className="tooltip-details">
                      <ul>
                        {step.details.slice(0, 3).map((detail: string, detailIndex: number) => (
                          <li key={detailIndex}>{detail}</li>
                        ))}
                      {step.details.length > 3 && (
                        <li className="more-details">+{step.details.length - 3} more...</li>
                      )}
                      </ul>
                    </div>
                  )}
                  <div className="tooltip-timestamp">
                    {step.date !== "-" && (
                      <span>{step.date} {step.time}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="current-stage">Current Stage: {currentStage}</p>

        <div className="activity-card">
          <h3>Activity Log</h3>

          <div className="activity-list">
            {activityLogs.map((log, index) => (
              <div className="activity-row" key={index}>
                <div className="activity-date">
                  <span className="activity-dot" />
                  <span>{log.date}</span>
                </div>

                <p className="activity-text">{log.text}</p>

                <p className="activity-user">– {log.user}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
export default LifecycleTracking;