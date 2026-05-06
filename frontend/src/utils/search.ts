import { dataService } from '../services/dataService';

export interface SearchResult {
  id: string;
  type: 'case' | 'department' | 'party' | 'user' | 'alert';
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
    const { query, limit = 10, types = ['case', 'department', 'party', 'user', 'alert'] } = options;
    
    if (!query || query.trim().length < 2) {
      return [];
    }

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase().trim();

    // Search cases
    if (types.includes('case')) {
      const casesData = dataService.getCasesData();
      const caseResults = casesData
        .filter(caseItem => 
          caseItem.title.toLowerCase().includes(queryLower) ||
          caseItem.description?.toLowerCase().includes(queryLower) ||
          caseItem.department?.toLowerCase().includes(queryLower) ||
          caseItem.assignedTo?.toLowerCase().includes(queryLower) ||
          caseItem.status?.toLowerCase().includes(queryLower) ||
          caseItem.priority?.toLowerCase().includes(queryLower)
        )
        .slice(0, limit)
        .map(caseItem => ({
          id: caseItem.id,
          type: 'case' as const,
          title: caseItem.title,
          description: caseItem.description,
          metadata: {
            department: caseItem.department,
            status: caseItem.status,
            priority: caseItem.priority,
            deadline: caseItem.deadline,
            assignedTo: caseItem.assignedTo
          },
          url: `/cases/${caseItem.id}`
        }));
      
      results.push(...caseResults);
    }

    // Search departments (from cases and users)
    if (types.includes('department')) {
      const casesData = dataService.getCasesData();
      const usersData = dataService.getUsers();
      
      const departments = new Set<string>();
      casesData.forEach(caseItem => {
        if (caseItem.department) departments.add(caseItem.department);
      });
      usersData.forEach(user => {
        if (user.department) departments.add(user.department);
      });

      const departmentResults = Array.from(departments)
        .filter(dept => dept.toLowerCase().includes(queryLower))
        .slice(0, limit)
        .map(dept => ({
          id: `dept-${dept.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'department' as const,
          title: dept,
          description: `Department - ${dept}`,
          metadata: { name: dept },
          url: `/departments/${dept.toLowerCase().replace(/\s+/g, '-')}`
        }));
      
      results.push(...departmentResults);
    }

    // Search parties (from cases - assuming parties are mentioned in case titles/descriptions)
    if (types.includes('party')) {
      const casesData = dataService.getCasesData();
      
      // Extract potential party names from case data
      const partyNames = new Set<string>();
      casesData.forEach(caseItem => {
        // Simple extraction - in real app, this would be more sophisticated
        const words = caseItem.title.split(' ');
        words.forEach(word => {
          if (word.length > 3 && !['vs', 'v', 'and', 'the', 'of', 'in', 'on', 'for'].includes(word.toLowerCase())) {
            partyNames.add(word);
          }
        });
      });

      const partyResults = Array.from(partyNames)
        .filter(party => party.toLowerCase().includes(queryLower))
        .slice(0, limit)
        .map(party => ({
          id: `party-${party.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'party' as const,
          title: party,
          description: `Party - ${party}`,
          metadata: { name: party },
          url: `/parties/${party.toLowerCase().replace(/\s+/g, '-')}`
        }));
      
      results.push(...partyResults);
    }

    // Search users
    if (types.includes('user')) {
      const usersData = dataService.getUsers();
      
      const userResults = usersData
        .filter(user => 
          user.name.toLowerCase().includes(queryLower) ||
          user.email.toLowerCase().includes(queryLower) ||
          user.department?.toLowerCase().includes(queryLower) ||
          user.role?.toLowerCase().includes(queryLower) ||
          user.employeeId?.toLowerCase().includes(queryLower)
        )
        .slice(0, limit)
        .map(user => ({
          id: user.id,
          type: 'user' as const,
          title: user.name,
          description: `${user.role} - ${user.department}`,
          metadata: {
            email: user.email,
            department: user.department,
            role: user.role,
            employeeId: user.employeeId
          },
          url: `/users/${user.id}`
        }));
      
      results.push(...userResults);
    }

    // Search alerts
    if (types.includes('alert')) {
      const alertsData = dataService.getAlertsData();
      
      const alertResults = alertsData
        .filter(alert => 
          alert.title.toLowerCase().includes(queryLower) ||
          alert.message?.toLowerCase().includes(queryLower) ||
          alert.description?.toLowerCase().includes(queryLower) ||
          alert.type?.toLowerCase().includes(queryLower) ||
          alert.severity?.toLowerCase().includes(queryLower) ||
          alert.department?.toLowerCase().includes(queryLower) ||
          alert.assignedTo?.toLowerCase().includes(queryLower)
        )
        .slice(0, limit)
        .map(alert => ({
          id: alert.id,
          type: 'alert' as const,
          title: alert.title,
          description: alert.message || alert.description,
          metadata: {
            severity: alert.severity,
            type: alert.type,
            department: alert.department,
            timestamp: alert.timestamp,
            acknowledged: alert.acknowledged
          },
          url: `/alerts/${alert.id}`
        }));
      
      results.push(...alertResults);
    }

    // Sort by relevance (exact matches first, then by title)
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === queryLower;
      const bExact = b.title.toLowerCase() === queryLower;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      const aStarts = a.title.toLowerCase().startsWith(queryLower);
      const bStarts = b.title.toLowerCase().startsWith(queryLower);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.title.localeCompare(b.title);
    });

    return results.slice(0, limit);
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
