import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Building, Users, User, AlertTriangle, X } from 'lucide-react';
import { searchService, type SearchResult } from '../utils/search';

interface SearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchDropdown = ({ isOpen, onClose }: SearchDropdownProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          } else if (query.trim().length >= 2) {
            handleSearch();
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results, query]);

  const handleSearch = async () => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await searchService.search({ query, limit: 8 });
      setResults(searchResults);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedIndex(-1);

    if (newQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    onClose();
    setQuery('');
    setResults([]);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'case':
        return <FileText size={16} className="text-blue-500" />;
      case 'department':
        return <Building size={16} className="text-purple-500" />;
      case 'party':
        return <Users size={16} className="text-green-500" />;
      case 'user':
        return <User size={16} className="text-orange-500" />;
      case 'alert':
        return <AlertTriangle size={16} className="text-red-500" />;
      default:
        return <Search size={16} className="text-gray-500" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'case':
        return 'Case';
      case 'department':
        return 'Department';
      case 'party':
        return 'Party';
      case 'user':
        return 'User';
      case 'alert':
        return 'Alert';
      default:
        return 'Unknown';
    }
  };

  const formatMetadata = (result: SearchResult) => {
    if (!result.metadata) return '';

    const parts: string[] = [];
    
    if (result.type === 'case') {
      if (result.metadata.department) parts.push(result.metadata.department);
      if (result.metadata.status) parts.push(result.metadata.status);
      if (result.metadata.priority) parts.push(result.metadata.priority);
    } else if (result.type === 'user') {
      if (result.metadata.role) parts.push(result.metadata.role);
      if (result.metadata.department) parts.push(result.metadata.department);
    } else if (result.type === 'alert') {
      if (result.metadata.severity) parts.push(result.metadata.severity);
      if (result.metadata.department) parts.push(result.metadata.department);
    }

    return parts.join(' • ');
  };

  if (!isOpen) return null;

  return (
    <div className="search-dropdown" ref={dropdownRef}>
      <div className="search-input-wrapper">
        <Search size={16} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search cases, departments, parties..."
          value={query}
          onChange={handleInputChange}
          className="search-input"
          aria-label="Search"
        />
        {query && (
          <button 
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="search-clear"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="search-results">
        {isLoading && (
          <div className="search-loading">
            <div className="search-spinner"></div>
            <span>Searching...</span>
          </div>
        )}

        {!isLoading && query.trim().length < 2 && (
          <div className="search-empty">
            <Search size={24} className="text-gray-300" />
            <p>Type at least 2 characters to search</p>
          </div>
        )}

        {!isLoading && query.trim().length >= 2 && results.length === 0 && (
          <div className="search-empty">
            <Search size={24} className="text-gray-300" />
            <p>No results found for "{query}"</p>
            <p className="search-hint">Try searching for cases, departments, users, or alerts</p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="search-results-list">
            {results.map((result, index) => (
              <div
                key={`${result.type}-${result.id}`}
                className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleResultClick(result)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="search-result-icon">
                  {getIcon(result.type)}
                </div>
                <div className="search-result-content">
                  <div className="search-result-header">
                    <h4>{result.title}</h4>
                    <span className="search-result-type">{getTypeLabel(result.type)}</span>
                  </div>
                  {result.description && (
                    <p className="search-result-description">{result.description}</p>
                  )}
                  {formatMetadata(result) && (
                    <p className="search-result-metadata">{formatMetadata(result)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchDropdown;
