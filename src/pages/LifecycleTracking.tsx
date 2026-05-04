import {
  Check,
  Lock,
  FileCheck,
  Landmark,
} from "lucide-react";
import "../styles/dashboard.css";
import AppLayout from "../components/layout/AppLayout";
import { useState, useEffect } from "react";
import lifecycleData from "../data/lifecycleData.json";

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
  const [lifecycleSteps, setLifecycleSteps] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<string>("");

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
    // Load data from JSON
    const steps = lifecycleData.lifecycleSteps.map(step => ({
      ...step,
      icon: getIcon(step.iconType, step.iconType === "lock" ? 17 : 18)
    }));
    
    setLifecycleSteps(steps);
    setActivityLogs(lifecycleData.activityLogs);
    setCurrentStage(getCurrentStage(steps));
  }, []);
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