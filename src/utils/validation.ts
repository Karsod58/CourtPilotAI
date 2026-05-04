// Validation utilities for forms

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  department: string;
  role: string;
  employeeId: string;
}

export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'Email is required';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  // Government email validation (optional - can be adjusted)
  if (!email.toLowerCase().includes('@gov.in') && !email.toLowerCase().includes('@')) {
    return 'Please use a valid government email address';
  }
  
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  
  if (password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  
  if (password.length > 50) {
    return 'Password must be less than 50 characters';
  }
  
  // Password strength requirements
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name) {
    return 'Full name is required';
  }
  
  if (name.length < 2) {
    return 'Name must be at least 2 characters long';
  }
  
  if (name.length > 100) {
    return 'Name must be less than 100 characters';
  }
  
  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(name)) {
    return 'Name can only contain letters, spaces, hyphens, and apostrophes';
  }
  
  return null;
};

export const validateEmployeeId = (employeeId: string): string | null => {
  if (!employeeId) {
    return 'Employee ID is required';
  }
  
  if (employeeId.length < 3) {
    return 'Employee ID must be at least 3 characters long';
  }
  
  if (employeeId.length > 20) {
    return 'Employee ID must be less than 20 characters';
  }
  
  // Allow alphanumeric characters, hyphens, and underscores
  const employeeIdRegex = /^[a-zA-Z0-9-_]+$/;
  if (!employeeIdRegex.test(employeeId)) {
    return 'Employee ID can only contain letters, numbers, hyphens, and underscores';
  }
  
  return null;
};

export const validateDepartment = (department: string): string | null => {
  if (!department) {
    return 'Department is required';
  }
  
  const validDepartments = [
    'Legal Department',
    'Finance Department',
    'PWD',
    'Health Department',
    'Education Department'
  ];
  
  if (!validDepartments.includes(department)) {
    return 'Please select a valid department';
  }
  
  return null;
};

export const validateRole = (role: string): string | null => {
  if (!role) {
    return 'Role is required';
  }
  
  const validRoles = [
    'Legal Officer',
    'Finance Officer',
    'Project Officer',
    'Department Head',
    'Administrator'
  ];
  
  if (!validRoles.includes(role)) {
    return 'Please select a valid role';
  }
  
  return null;
};

export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  
  return null;
};

export const validateLoginForm = (formData: LoginFormData): ValidationResult => {
  const errors: string[] = [];
  
  const emailError = validateEmail(formData.email);
  if (emailError) errors.push(emailError);
  
  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.push(passwordError);
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateRegisterForm = (formData: RegisterFormData): ValidationResult => {
  const errors: string[] = [];
  
  const nameError = validateName(formData.name);
  if (nameError) errors.push(nameError);
  
  const emailError = validateEmail(formData.email);
  if (emailError) errors.push(emailError);
  
  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.push(passwordError);
  
  const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
  if (confirmPasswordError) errors.push(confirmPasswordError);
  
  const employeeIdError = validateEmployeeId(formData.employeeId);
  if (employeeIdError) errors.push(employeeIdError);
  
  const departmentError = validateDepartment(formData.department);
  if (departmentError) errors.push(departmentError);
  
  const roleError = validateRole(formData.role);
  if (roleError) errors.push(roleError);
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const getPasswordStrength = (password: string): { score: number; feedback: string[] } => {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) score += 1;
  else feedback.push('Add at least 8 characters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letter');
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letter');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Add number');
  
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Add special character');
  
  return { score, feedback };
};
