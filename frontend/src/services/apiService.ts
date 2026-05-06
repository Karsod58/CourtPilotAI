/**
 * CourtPilot Backend API Service
 * Connects the React UI to the FastAPI backend
 */

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Types
export interface Judgment {
  id: string;
  case_id: string;
  court_name: string;
  judgment_date: string;
  petitioner: string;
  respondent: string;
  judge_name?: string;
  case_type: string;
  status: string;
  uploaded_at: string;
  processed_at?: string;
  page_count?: number;
  departments_involved?: string[];
}

export interface Directive {
  id: string;
  judgment_id: string;
  directive_text: string;
  directive_type: string;
  priority: string;
  confidence_score: number;
  action_required: string;
  responsible_entity: string;
  deadline?: string;
  deadline_text?: string;
  status: string;
  assigned_department?: string;
  verification_status?: string;
  verified_by?: string;
  verified_at?: string;
  source_page_number?: number;
  assignment_confidence?: number;
}

export interface ChatSession {
  id: string;
  user_id: string;
  user_name: string;
  judgment_id?: string;
  context_type: string;
  title: string;
  is_active: boolean;
  created_at: string;
  last_message_at?: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  sources?: any[];
  created_at: string;
  helpful?: boolean;
}

export interface ChatResponse {
  message_id: string;
  content: string;
  sources?: any[];
  timestamp: string;
}

export interface UploadJudgmentData {
  case_id?: string;  // Optional - will auto-extract if missing
  case_type: string;
  court_name?: string;  // Optional - will auto-extract if missing
  judge_name?: string;
  judgment_date?: string;
  petitioner?: string;
  respondent?: string;
}

export interface ActionPlan {
  id: string;
  judgment_id: string;
  title: string;
  description?: string;
  department_id: string;
  department_name: string;
  assigned_officer_id?: string;
  assigned_officer_name?: string;
  deadline: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  status: string;
  progress_percentage: number;
  priority: string;
  risk_level?: string;
  directive_ids?: string[];
  action_items?: any[];
  created_at: string;
  updated_at: string;
}

export interface Deadline {
  id: string;
  type: string;
  title: string;
  description?: string;
  deadline: string;
  days_until: number;
  is_overdue: boolean;
  status: string;
  priority: string;
  department: string;
  judgment_id: string;
  confidence_score?: number;
  progress_percentage?: number;
}

export interface Alert {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  entity_id: string;
  entity_type: string;
  judgment_id: string;
  department?: string;
  deadline?: string;
  days_overdue?: number;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  head: string;
  contact: string;
  statistics?: {
    total_directives: number;
    total_action_plans: number;
    overdue_items: number;
  };
}

export interface LifecycleStage {
  status: string;
  date?: string;
  description: string;
  pending_count?: number;
  verified_count?: number;
  action_plans_count?: number;
  completed_count?: number;
  in_progress_count?: number;
}

export interface SearchResult {
  total: number;
  query: string;
  results: {
    judgments: any[];
    directives: any[];
    action_plans: any[];
  };
}

class APIService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // ============================================================================
  // JUDGMENT ENDPOINTS
  // ============================================================================

  /**
   * Upload a judgment PDF file
   */
  async uploadJudgment(file: File, metadata: UploadJudgmentData): Promise<Judgment> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Only append fields that are provided
    if (metadata.case_id) formData.append('case_id', metadata.case_id);
    formData.append('case_type', metadata.case_type);
    if (metadata.court_name) formData.append('court_name', metadata.court_name);
    if (metadata.judge_name) formData.append('judge_name', metadata.judge_name);
    if (metadata.judgment_date) formData.append('judgment_date', metadata.judgment_date);
    if (metadata.petitioner) formData.append('petitioner', metadata.petitioner);
    if (metadata.respondent) formData.append('respondent', metadata.respondent);
    
    // Enable auto-extraction if case_id or court_name is missing
    formData.append('auto_extract', (!metadata.case_id || !metadata.court_name) ? 'true' : 'false');

    const response = await fetch(`${this.baseURL}/judgments/upload`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse<Judgment>(response);
  }

  /**
   * Get all judgments with pagination
   */
  async getJudgments(page: number = 1, pageSize: number = 20): Promise<{ total: number; items: Judgment[] }> {
    const response = await fetch(
      `${this.baseURL}/judgments/?page=${page}&page_size=${pageSize}`
    );
    return this.handleResponse(response);
  }

  /**
   * Get a specific judgment by ID
   */
  async getJudgment(judgmentId: string): Promise<Judgment> {
    const response = await fetch(`${this.baseURL}/judgments/${judgmentId}`);
    return this.handleResponse(response);
  }

  /**
   * Get judgment processing status
   */
  async getJudgmentStatus(judgmentId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/judgments/${judgmentId}/status`);
    return this.handleResponse(response);
  }

  /**
   * Trigger manual processing of a judgment
   */
  async processJudgment(judgmentId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/judgments/${judgmentId}/process`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  /**
   * Get directives for a judgment
   */
  async getJudgmentDirectives(judgmentId: string): Promise<{ total: number; items: Directive[] }> {
    const response = await fetch(`${this.baseURL}/judgments/${judgmentId}/directives`);
    return this.handleResponse(response);
  }

  // ============================================================================
  // CHAT ENDPOINTS
  // ============================================================================

  /**
   * Create a new chat session
   */
  async createChatSession(
    userId: string,
    userName: string,
    judgmentId?: string,
    contextType: string = 'general'
  ): Promise<ChatSession> {
    const response = await fetch(
      `${this.baseURL}/chat/sessions?user_id=${encodeURIComponent(userId)}&user_name=${encodeURIComponent(userName)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judgment_id: judgmentId,
          context_type: contextType,
        }),
      }
    );
    return this.handleResponse(response);
  }

  /**
   * Get all chat sessions for a user
   */
  async getChatSessions(userId: string, activeOnly: boolean = true): Promise<ChatSession[]> {
    const response = await fetch(
      `${this.baseURL}/chat/sessions?user_id=${encodeURIComponent(userId)}&active_only=${activeOnly}`
    );
    return this.handleResponse(response);
  }

  /**
   * Get a specific chat session
   */
  async getChatSession(sessionId: string): Promise<ChatSession> {
    const response = await fetch(`${this.baseURL}/chat/sessions/${sessionId}`);
    return this.handleResponse(response);
  }

  /**
   * Send a message in a chat session
   */
  async sendChatMessage(
    sessionId: string,
    userId: string,
    message: string
  ): Promise<ChatResponse> {
    const response = await fetch(
      `${this.baseURL}/chat/sessions/${sessionId}/messages?user_id=${encodeURIComponent(userId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }
    );
    return this.handleResponse(response);
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const response = await fetch(`${this.baseURL}/chat/sessions/${sessionId}/messages`);
    return this.handleResponse(response);
  }

  /**
   * Close a chat session
   */
  async closeChatSession(sessionId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/chat/sessions/${sessionId}/close`, {
      method: 'POST',
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // VERIFICATION ENDPOINTS
  // ============================================================================

  /**
   * Get directives pending verification
   */
  async getPendingDirectives(): Promise<{ total: number; items: Directive[] }> {
    const response = await fetch(`${this.baseURL}/verification/pending`);
    return this.handleResponse(response);
  }

  /**
   * Verify a directive
   */
  async verifyDirective(
    directiveId: string,
    verified: boolean,
    notes?: string,
    corrections?: any
  ): Promise<any> {
    const response = await fetch(`${this.baseURL}/verification/${directiveId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verified,
        verification_notes: notes,
        ...corrections
      }),
    });
    return this.handleResponse(response);
  }

  /**
   * Assign department to a directive
   */
  async assignDepartment(directiveId: string, department: string): Promise<any> {
    const response = await fetch(
      `${this.baseURL}/verification/${directiveId}/assign-department`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department }),
      }
    );
    return this.handleResponse(response);
  }

  // ============================================================================
  // ANALYTICS ENDPOINTS
  // ============================================================================

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(): Promise<any> {
    const response = await fetch(`${this.baseURL}/analytics/dashboard`);
    return this.handleResponse(response);
  }

  /**
   * Get compliance metrics
   */
  async getComplianceMetrics(): Promise<any> {
    const response = await fetch(`${this.baseURL}/analytics/compliance`);
    return this.handleResponse(response);
  }

  /**
   * Get department performance
   */
  async getDepartmentPerformance(): Promise<any> {
    const response = await fetch(`${this.baseURL}/analytics/departments`);
    return this.handleResponse(response);
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  /**
   * Check API health
   */
  async healthCheck(): Promise<{ status: string; app: string; version: string }> {
    const response = await fetch(`${this.baseURL.replace('/api/v1', '')}/health`);
    return this.handleResponse(response);
  }

  // ============================================================================
  // ACTION PLANS ENDPOINTS
  // ============================================================================

  /**
   * Get all action plans
   */
  async getActionPlans(
    status?: string,
    department?: string,
    priority?: string,
    overdueOnly: boolean = false,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ total: number; page: number; page_size: number; items: ActionPlan[] }> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (status) params.append('status', status);
    if (department) params.append('department', department);
    if (priority) params.append('priority', priority);
    if (overdueOnly) params.append('overdue_only', 'true');

    const response = await fetch(`${this.baseURL}/actions/?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Get action plan by ID
   */
  async getActionPlan(actionPlanId: string): Promise<ActionPlan> {
    const response = await fetch(`${this.baseURL}/actions/${actionPlanId}`);
    return this.handleResponse(response);
  }

  /**
   * Create new action plan
   */
  async createActionPlan(data: {
    judgment_id: string;
    department_name: string;
    title: string;
    description?: string;
    deadline?: string;
    priority?: string;
    directive_ids?: string[];
  }): Promise<ActionPlan> {
    const response = await fetch(`${this.baseURL}/actions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  /**
   * Update action plan status
   */
  async updateActionPlanStatus(
    actionPlanId: string,
    status: string,
    notes?: string,
    updatedBy?: string
  ): Promise<ActionPlan> {
    const params = new URLSearchParams({ status });
    if (notes) params.append('notes', notes);
    if (updatedBy) params.append('updated_by', updatedBy);

    const response = await fetch(`${this.baseURL}/actions/${actionPlanId}/status?${params}`, {
      method: 'PUT',
    });
    return this.handleResponse(response);
  }

  /**
   * Update action plan progress
   */
  async updateActionPlanProgress(
    actionPlanId: string,
    progressPercentage: number,
    notes?: string,
    updatedBy?: string
  ): Promise<ActionPlan> {
    const params = new URLSearchParams({
      progress_percentage: progressPercentage.toString(),
    });
    if (notes) params.append('notes', notes);
    if (updatedBy) params.append('updated_by', updatedBy);

    const response = await fetch(`${this.baseURL}/actions/${actionPlanId}/progress?${params}`, {
      method: 'PUT',
    });
    return this.handleResponse(response);
  }

  /**
   * Get department action plans
   */
  async getDepartmentActionPlans(
    departmentName: string,
    status?: string
  ): Promise<{ department: string; total: number; items: ActionPlan[] }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await fetch(`${this.baseURL}/actions/department/${departmentName}?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Get overdue action plans
   */
  async getOverdueActionPlans(): Promise<{ total: number; items: ActionPlan[] }> {
    const response = await fetch(`${this.baseURL}/actions/overdue/list`);
    return this.handleResponse(response);
  }

  /**
   * Delete action plan
   */
  async deleteActionPlan(actionPlanId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/actions/${actionPlanId}`, {
      method: 'DELETE',
    });
    return this.handleResponse(response);
  }

  // ============================================================================
  // DEADLINES ENDPOINTS
  // ============================================================================

  /**
   * Get all deadlines
   */
  async getAllDeadlines(
    upcomingDays: number = 30,
    includeCompleted: boolean = false,
    department?: string
  ): Promise<{ total: number; overdue: number; due_this_week: number; due_this_month: number; items: Deadline[] }> {
    const params = new URLSearchParams({
      upcoming_days: upcomingDays.toString(),
      include_completed: includeCompleted.toString(),
    });
    if (department) params.append('department', department);

    const response = await fetch(`${this.baseURL}/deadlines/?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Get overdue deadlines
   */
  async getOverdueDeadlines(department?: string): Promise<{ total: number; items: Deadline[] }> {
    const params = new URLSearchParams();
    if (department) params.append('department', department);

    const response = await fetch(`${this.baseURL}/deadlines/overdue?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Get upcoming deadlines
   */
  async getUpcomingDeadlines(
    days: number = 7,
    department?: string
  ): Promise<{ total: number; days: number; items: Deadline[] }> {
    const params = new URLSearchParams({ days: days.toString() });
    if (department) params.append('department', department);

    const response = await fetch(`${this.baseURL}/deadlines/upcoming?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Get department deadlines
   */
  async getDepartmentDeadlines(
    departmentName: string,
    includeCompleted: boolean = false
  ): Promise<{ department: string; total: number; overdue: number; upcoming: number; items: Deadline[] }> {
    const params = new URLSearchParams({
      include_completed: includeCompleted.toString(),
    });

    const response = await fetch(`${this.baseURL}/deadlines/department/${departmentName}?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Get deadline statistics
   */
  async getDeadlineStatistics(): Promise<any> {
    const response = await fetch(`${this.baseURL}/deadlines/statistics`);
    return this.handleResponse(response);
  }

  // ============================================================================
  // SEARCH ENDPOINTS
  // ============================================================================

  /**
   * Global search
   */
  async globalSearch(
    query: string,
    searchType: string = 'all',
    limit: number = 50
  ): Promise<SearchResult> {
    const params = new URLSearchParams({
      q: query,
      search_type: searchType,
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseURL}/search/?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Search judgments
   */
  async searchJudgments(
    query: string,
    status?: string,
    court?: string,
    dateFrom?: string,
    dateTo?: string,
    limit: number = 50
  ): Promise<{ total: number; query: string; filters: any; items: Judgment[] }> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    if (court) params.append('court', court);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    const response = await fetch(`${this.baseURL}/search/judgments?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Search directives
   */
  async searchDirectives(
    query: string,
    status?: string,
    priority?: string,
    department?: string,
    limit: number = 50
  ): Promise<{ total: number; query: string; filters: any; items: Directive[] }> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (department) params.append('department', department);

    const response = await fetch(`${this.baseURL}/search/directives?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Find similar judgments
   */
  async findSimilarJudgments(
    judgmentId: string,
    limit: number = 10
  ): Promise<{ reference_judgment_id: string; total: number; items: Judgment[] }> {
    const params = new URLSearchParams({ limit: limit.toString() });

    const response = await fetch(`${this.baseURL}/search/similar/${judgmentId}?${params}`);
    return this.handleResponse(response);
  }

  // ============================================================================
  // TRACKING/LIFECYCLE ENDPOINTS
  // ============================================================================

  /**
   * Get lifecycle status
   */
  async getLifecycleStatus(judgmentId: string): Promise<{
    judgment_id: string;
    case_id: string;
    current_stage: string;
    progress_percentage: number;
    stages: Record<string, LifecycleStage>;
    summary: any;
  }> {
    const response = await fetch(`${this.baseURL}/tracking/lifecycle/${judgmentId}`);
    return this.handleResponse(response);
  }

  /**
   * Get timeline
   */
  async getTimeline(judgmentId: string): Promise<{
    judgment_id: string;
    case_id: string;
    total_events: number;
    timeline: any[];
  }> {
    const response = await fetch(`${this.baseURL}/tracking/timeline/${judgmentId}`);
    return this.handleResponse(response);
  }

  /**
   * Get audit trail
   */
  async getAuditTrail(judgmentId: string): Promise<{
    judgment_id: string;
    case_id: string;
    total_entries: number;
    audit_trail: any[];
  }> {
    const response = await fetch(`${this.baseURL}/tracking/audit/${judgmentId}`);
    return this.handleResponse(response);
  }

  /**
   * Get tracking statistics
   */
  async getTrackingStatistics(): Promise<any> {
    const response = await fetch(`${this.baseURL}/tracking/statistics`);
    return this.handleResponse(response);
  }

  // ============================================================================
  // ALERTS ENDPOINTS
  // ============================================================================

  /**
   * Get all alerts
   */
  async getAllAlerts(
    severity?: string,
    status?: string,
    limit: number = 50
  ): Promise<{ total: number; by_severity: any; items: Alert[] }> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (severity) params.append('severity', severity);
    if (status) params.append('status', status);

    const response = await fetch(`${this.baseURL}/alerts/?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<{ total: number; by_severity: any; items: Alert[] }> {
    const response = await fetch(`${this.baseURL}/alerts/active`);
    return this.handleResponse(response);
  }

  /**
   * Get critical alerts
   */
  async getCriticalAlerts(): Promise<{ total: number; by_severity: any; items: Alert[] }> {
    const response = await fetch(`${this.baseURL}/alerts/critical`);
    return this.handleResponse(response);
  }

  /**
   * Get escalated items
   */
  async getEscalatedItems(): Promise<{ total: number; items: any[] }> {
    const response = await fetch(`${this.baseURL}/alerts/escalated`);
    return this.handleResponse(response);
  }

  /**
   * Get department alerts
   */
  async getDepartmentAlerts(departmentName: string): Promise<{ department: string; total: number; items: Alert[] }> {
    const response = await fetch(`${this.baseURL}/alerts/department/${departmentName}`);
    return this.handleResponse(response);
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(): Promise<any> {
    const response = await fetch(`${this.baseURL}/alerts/statistics`);
    return this.handleResponse(response);
  }

  // ============================================================================
  // DEPARTMENTS ENDPOINTS
  // ============================================================================

  /**
   * Get all departments
   */
  async getAllDepartments(): Promise<{ total: number; items: Department[] }> {
    const response = await fetch(`${this.baseURL}/departments/`);
    return this.handleResponse(response);
  }

  /**
   * Get department details
   */
  async getDepartmentDetails(departmentId: string): Promise<Department> {
    const response = await fetch(`${this.baseURL}/departments/${departmentId}`);
    return this.handleResponse(response);
  }

  /**
   * Get department actions
   */
  async getDepartmentActions(
    departmentId: string,
    status?: string
  ): Promise<{ department_id: string; department_name: string; total: number; items: ActionPlan[] }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await fetch(`${this.baseURL}/departments/${departmentId}/actions?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Get department performance
   */
  async getDepartmentPerformanceMetrics(
    departmentId: string,
    days: number = 30
  ): Promise<any> {
    const params = new URLSearchParams({ days: days.toString() });

    const response = await fetch(`${this.baseURL}/departments/${departmentId}/performance?${params}`);
    return this.handleResponse(response);
  }

  /**
   * Compare department performance
   */
  async compareDepartmentPerformance(): Promise<{ total_departments: number; comparison: any[] }> {
    const response = await fetch(`${this.baseURL}/departments/performance/comparison`);
    return this.handleResponse(response);
  }
}

// Export singleton instance
export const apiService = new APIService();
