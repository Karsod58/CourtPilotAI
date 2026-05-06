import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { validateRegisterForm, getPasswordStrength } from "../utils/validation";
import ErrorBoundary from "../components/ErrorBoundary";
import "../styles/dashboard.css";

const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    role: "",
    employeeId: "",
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    department?: string;
    role?: string;
    employeeId?: string;
  }>({});
  const [passwordMatchStatus, setPasswordMatchStatus] = useState<'match' | 'no-match' | null>(null);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    department: false,
    role: false,
    employeeId: false,
  });
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] as string[] });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation errors when user starts typing
    if (touched[name as keyof typeof touched]) {
      validateField(name as keyof typeof formData, value);
    }
    
    // Update password strength
    if (name === 'password') {
      setPasswordStrength(getPasswordStrength(value));
    }
    
    // Check password matching in real-time
    if (name === 'password' || name === 'confirmPassword') {
      const password = name === 'password' ? value : formData.password;
      const confirmPassword = name === 'confirmPassword' ? value : formData.confirmPassword;
      
      if (password && confirmPassword) {
        if (password === confirmPassword) {
          setPasswordMatchStatus('match');
        } else {
          setPasswordMatchStatus('no-match');
        }
      } else {
        setPasswordMatchStatus(null);
      }
    }
    
    setValidationErrors([]);
  };

  const validateField = (field: keyof typeof formData, value: string) => {
    const tempFormData = { ...formData, [field]: value };
    const validation = validateRegisterForm(tempFormData);
    
    if (!validation.isValid) {
      const fieldSpecificErrors = validation.errors.filter(error => {
        const fieldLower = field.toLowerCase();
        const errorLower = error.toLowerCase();
        
        if (fieldLower === 'name') return errorLower.includes('name') || errorLower.includes('full');
        if (fieldLower === 'email') return errorLower.includes('email');
        if (fieldLower === 'password') return errorLower.includes('password') && !errorLower.includes('confirm');
        if (fieldLower === 'confirmpassword') return errorLower.includes('confirm') || errorLower.includes('match');
        if (fieldLower === 'employeeid') return errorLower.includes('employee') || errorLower.includes('id');
        if (fieldLower === 'department') return errorLower.includes('department');
        if (fieldLower === 'role') return errorLower.includes('role');
        
        return false;
      });
      
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

  const handleFieldBlur = (field: keyof typeof formData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      department: true,
      role: true,
      employeeId: true,
    });
    
    // Validate all fields
    const validation = validateRegisterForm(formData);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      
      // Set field-specific errors
      validation.errors.forEach(error => {
        const errorLower = error.toLowerCase();
        
        if (errorLower.includes('name') || errorLower.includes('full')) {
          setFieldErrors(prev => ({ ...prev, name: error }));
        } else if (errorLower.includes('email')) {
          setFieldErrors(prev => ({ ...prev, email: error }));
        } else if (errorLower.includes('password') && !errorLower.includes('confirm')) {
          setFieldErrors(prev => ({ ...prev, password: error }));
        } else if (errorLower.includes('confirm') || errorLower.includes('match')) {
          setFieldErrors(prev => ({ ...prev, confirmPassword: error }));
        } else if (errorLower.includes('employee') || errorLower.includes('id')) {
          setFieldErrors(prev => ({ ...prev, employeeId: error }));
        } else if (errorLower.includes('department')) {
          setFieldErrors(prev => ({ ...prev, department: error }));
        } else if (errorLower.includes('role')) {
          setFieldErrors(prev => ({ ...prev, role: error }));
        }
      });
      
      return;
    }
    
    // Clear any existing errors
    setValidationErrors([]);
    setFieldErrors({});

    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        department: formData.department,
        role: formData.role,
        employeeId: formData.employeeId,
      };

      const success = await register(userData);
      if (success) {
        // Redirect to login page after successful registration
        navigate("/login", { state: { from: 'register' } });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setValidationErrors(['An unexpected error occurred during registration. Please try again.']);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <h1>Create Account</h1>
          <p>
            Register your department access to start using CourtPilot AI for
            compliance automation.
          </p>

          <div className="feature-list">
            <div className="feature-item">Secure Government Access</div>
            <div className="feature-item">Role-based Control</div>
            <div className="feature-item">Audit-ready Tracking</div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2>Register</h2>
          <p className="auth-sub">Create your account</p>

          <ErrorBoundary>
            <form onSubmit={handleRegister} className="auth-form">
              {/* Validation Summary */}
              {validationErrors.length > 0 && (
                <div className="form-validation-summary">
                  <h4>Please fix the following errors:</h4>
                  <ul>
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="auth-form-row">
                <input
                  className={`auth-input ${fieldErrors.name ? 'error' : ''}`}
                  name="name"
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('name')}
                  required
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                />
                {fieldErrors.name && (
                  <div className="field-error" id="name-error">
                    {fieldErrors.name}
                  </div>
                )}
              </div>

              <div className="auth-form-row">
                <input
                  className={`auth-input ${fieldErrors.email ? 'error' : ''}`}
                  name="email"
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
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
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
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
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="password-strength">
                    <div className="password-strength-bar">
                      <div 
                        className={`password-strength-fill ${
                          passwordStrength.score <= 2 ? 'weak' :
                          passwordStrength.score <= 3 ? 'fair' :
                          passwordStrength.score <= 4 ? 'good' :
                          passwordStrength.score <= 5 ? 'strong' : 'very-strong'
                        }`}
                      />
                    </div>
                    <div className="password-strength-text">
                      Password strength: {
                        passwordStrength.score <= 2 ? 'Weak' :
                        passwordStrength.score <= 3 ? 'Fair' :
                        passwordStrength.score <= 4 ? 'Good' :
                        passwordStrength.score <= 5 ? 'Strong' : 'Very Strong'
                      }
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <div className="password-requirements">
                        <p>To strengthen your password:</p>
                        <ul>
                          {passwordStrength.feedback.map((feedback, index) => (
                            <li key={index} className="unmet">{feedback}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="auth-form-row">
                <input
                  className={`auth-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  required
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                />
                {fieldErrors.confirmPassword && (
                  <div className="field-error" id="confirmPassword-error">
                    {fieldErrors.confirmPassword}
                  </div>
                )}
                
                {/* Password Match Feedback */}
                {passwordMatchStatus && !fieldErrors.confirmPassword && (
                  <div className={`field-${passwordMatchStatus === 'match' ? 'success' : 'error'}`}>
                    {passwordMatchStatus === 'match' ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}
              </div>

              <div className="auth-form-row">
                <input
                  className={`auth-input ${fieldErrors.employeeId ? 'error' : ''}`}
                  name="employeeId"
                  type="text"
                  placeholder="Employee ID"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('employeeId')}
                  required
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.employeeId}
                  aria-describedby={fieldErrors.employeeId ? 'employeeId-error' : undefined}
                />
                {fieldErrors.employeeId && (
                  <div className="field-error" id="employeeId-error">
                    {fieldErrors.employeeId}
                  </div>
                )}
              </div>

              <div className="auth-form-row">
                <select
                  className={`auth-input ${fieldErrors.department ? 'error' : ''}`}
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('department')}
                  required
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.department}
                  aria-describedby={fieldErrors.department ? 'department-error' : undefined}
                >
                  <option value="">Select Department</option>
                  <option value="Legal Department">Legal Department</option>
                  <option value="Finance Department">Finance Department</option>
                  <option value="PWD">PWD</option>
                  <option value="Health Department">Health Department</option>
                  <option value="Education Department">Education Department</option>
                </select>
                {fieldErrors.department && (
                  <div className="field-error" id="department-error">
                    {fieldErrors.department}
                  </div>
                )}
              </div>

              <div className="auth-form-row">
                <select
                  className={`auth-input ${fieldErrors.role ? 'error' : ''}`}
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('role')}
                  required
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.role}
                  aria-describedby={fieldErrors.role ? 'role-error' : undefined}
                >
                  <option value="">Select Role</option>
                  <option value="Legal Officer">Legal Officer</option>
                  <option value="Finance Officer">Finance Officer</option>
                  <option value="Project Officer">Project Officer</option>
                  <option value="Department Head">Department Head</option>
                  <option value="Administrator">Administrator</option>
                </select>
                {fieldErrors.role && (
                  <div className="field-error" id="role-error">
                    {fieldErrors.role}
                  </div>
                )}
              </div>

              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className={`auth-btn ${isLoading ? 'loading' : ''}`}
                disabled={isLoading || validationErrors.length > 0}
              >
                {isLoading ? "" : "Register"}
              </button>
            </form>
          </ErrorBoundary>
          <div className="auth-footer">
            <p className="auth-link">
              Already have an account?{" "}
              <span onClick={() => navigate("/login")}>Login</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;