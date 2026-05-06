import { apiService } from '../services/apiService';

export interface SearchResult {
  id: string;
  type: 'case' | 'department' | 'party' | 'user' | 'alert' | 'directive';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  url: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  types?: SearchResult['type'][];
}

export class SearchService {
  private static instance: SearchService;

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, limit = 10 } = options;
    
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      // Use the global search API
      const response = await apiService.globalSearch(query, 'all', limit);
      
      const results: SearchResult[] = [];

      // Transform judgments to search results
      if (response.results.judgments) {
        response.results.judgments.forEach((judgment: any) => {
          results.push({
            id: judgment.id,
            type: 'case',
            title: judgment.case_id,
            description: `${judgment.court_name} - ${judgment.case_type}`,
            metadata: {
              court: judgment.court_name,
              status: judgment.status,
              date: judgment.judgment_date,
              petitioner: judgment.petitioner,
              respondent: judgment.respondent
            },
            url: `/cases/${judgment.id}`
          });
        });
      }

      // Transform directives to search results
      if (response.results.directives) {
        response.results.directives.forEach((directive: any) => {
          results.push({
            id: directive.id,
            type: 'directive',
            title: directive.directive_text.substring(0, 100) + '...',
            description: `Priority: ${directive.priority} - ${directive.assigned_department || 'Unassigned'}`,
            metadata: {
              priority: directive.priority,
              department: directive.assigned_department,
              status: directive.verification_status,
              deadline: directive.deadline
            },
            url: `/verification`
          });
        });
      }

      // Transform action plans to search results
      if (response.results.action_plans) {
        response.results.action_plans.forEach((plan: any) => {
          results.push({
            id: plan.id,
            type: 'case',
            title: plan.title,
            description: `${plan.department_name} - ${plan.status}`,
            metadata: {
              department: plan.department_name,
              status: plan.status,
              priority: plan.priority,
              deadline: plan.deadline,
              progress: plan.progress_percentage
            },
            url: `/action-plan`
          });
        });
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  // Quick search for autocomplete
  async quickSearch(query: string, limit: number = 5): Promise<SearchResult[]> {
    return this.search({ query, limit });
  }

  // Search by specific type
  async searchByType(type: SearchResult['type'], query: string, limit: number = 10): Promise<SearchResult[]> {
    return this.search({ query, limit, types: [type] });
  }
}

export const searchService = SearchService.getInstance();
