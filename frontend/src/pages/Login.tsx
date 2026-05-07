import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { validateLoginForm } from "../utils/validation";
import ErrorBoundary from "../components/ErrorBoundary";
import { useToast } from "../components/ToastContainer";
import "../styles/dashboard.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error } = useAuth();
  const { showSuccess, showError } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });

  // Check if user was redirected from registration
  useEffect(() => {
    if (location.state?.from === 'register') {
      showSuccess("Registration successful! Please login with your credentials.");
    }
  }, [location.state, showSuccess]);

  const validateField = (field: 'email' | 'password', value: string) => {
    const formData = { email: field === 'email' ? value : email, password: field === 'password' ? value : password };
    const validation = validateLoginForm(formData);
    
    if (!validation.isValid) {
      const fieldSpecificErrors = validation.errors.filter(error => 
        field === 'email' ? error.toLowerCase().includes('email') : error.toLowerCase().includes('password')
      );
      
      setFieldErrors(prev => ({
        ...prev,
        [field]: fieldSpecificErrors[0]
      }));
      
      return fieldSpecificErrors.length === 0;
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [field]: undefined
    }));
    
    return true;
  };

  const handleFieldChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }
    
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleFieldBlur = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (field === 'email') {
      validateField(field, email);
    } else {
      validateField(field, password);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ email: true, password: true });
    
    // Validate all fields
    const validation = validateLoginForm({ email, password });
    
    if (!validation.isValid) {
      // Show first error as toast
      showError(validation.errors[0]);
      
      // Set field-specific errors
      validation.errors.forEach(error => {
        if (error.toLowerCase().includes('email')) {
          setFieldErrors(prev => ({ ...prev, email: error }));
        } else if (error.toLowerCase().includes('password')) {
          setFieldErrors(prev => ({ ...prev, password: error }));
        }
      });
      
      return;
    }
    
    // Clear any existing errors
    setFieldErrors({});

    try {
      const success = await login(email, password);
      if (success) {
        showSuccess("Login successful!");
        navigate("/");
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      {/* LEFT */}
      <div className="auth-left">
        <div className="auth-left-content">
          <h1>CourtPilot AI</h1>
          <p>
            Transform court judgments into actionable workflows with AI-powered
            compliance tracking and verification.
          </p>

          <div className="feature-list">
            <div className="feature-item">AI Directive Extraction</div>
            <div className="feature-item">Risk-based Prioritization</div>
            <div className="feature-item">Deadline Tracking & Alerts</div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className="auth-card">
          <h2>Login</h2>
          <p className="auth-sub">Access your dashboard</p>

          <ErrorBoundary>
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-form-row">
              <input
                className={`auth-input ${fieldErrors.email ? 'error' : ''}`}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                required
                disabled={isLoading}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <div className="field-error" id="email-error">
                  {fieldErrors.email}
                </div>
              )}
            </div>

            <div className="auth-form-row">
              <input
                className={`auth-input ${fieldErrors.password ? 'error' : ''}`}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                onBlur={() => handleFieldBlur('password')}
                required
                disabled={isLoading}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              {fieldErrors.password && (
                <div className="field-error" id="password-error">
                  {fieldErrors.password}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className={`auth-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? "" : "Login"}
            </button>
          </form>
        </ErrorBoundary>

          <div className="auth-footer">
            <p className="auth-link">
              Don't have an account?{" "}
              <span onClick={() => navigate("/register")}>Register</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;