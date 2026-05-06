import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Edit3, Filter, Download } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { apiService, type Directive, type Judgment } from "../services/apiService";
import "../styles/dashboard.css";

type FilterType = 'all' | 'approved' | 'rejected' | 'edited';

interface DirectiveWithCase extends Directive {
  case_id: string;
  court_name: string;
}

const VerifiedDirectives = () => {
  const [directives, setDirectives] = useState<DirectiveWithCase[]>([]);
  const [filteredDirectives, setFilteredDirectives] = useState<DirectiveWithCase[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVerifiedDirectives();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, directives]);

  const loadVerifiedDirectives = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all judgments
      const judgmentsResponse = await apiService.getJudgments(1, 100);
      const judgments = judgmentsResponse.items;

      // Get directives for each judgment
      const allDirectives: DirectiveWithCase[] = [];

      for (const judgment of judgments) {
        try {
          const directivesResponse = await apiService.getJudgmentDirectives(judgment.id);
          const verified = directivesResponse.items.filter(
            (d: Directive) =>
              d.verification_status === 'approved' ||
              d.verification_status === 'rejected' ||
              d.verification_status === 'edited'
          );

          // Add case info to each directive
          verified.forEach((d: Directive) => {
            allDirectives.push({
              ...d,
              case_id: judgment.case_id,
              court_name: judgment.court_name,
            });
          });
        } catch (err) {
          console.error(`Error loading directives for ${judgment.case_id}:`, err);
        }
      }

      // Sort by verification date (most recent first)
      allDirectives.sort((a, b) => {
        const dateA = a.verified_at ? new Date(a.verified_at).getTime() : 0;
        const dateB = b.verified_at ? new Date(b.verified_at).getTime() : 0;
        return dateB - dateA;
      });

      setDirectives(allDirectives);
    } catch (err) {
      console.error('Error loading verified directives:', err);
      setError('Failed to load verified directives. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredDirectives(directives);
    } else {
      setFilteredDirectives(
        directives.filter((d) => d.verification_status === filter)
      );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 size={18} className="status-icon approved" />;
      case 'rejected':
        return <XCircle size={18} className="status-icon rejected" />;
      case 'edited':
        return <Edit3 size={18} className="status-icon edited" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'edited':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const stats = {
    total: directives.length,
    approved: directives.filter((d) => d.verification_status === 'approved').length,
    rejected: directives.filter((d) => d.verification_status === 'rejected').length,
    edited: directives.filter((d) => d.verification_status === 'edited').length,
  };

  return (
    <AppLayout
      activeSidebarItem="verified-actions"
      showSearch={true}
      showUpload={false}
      pageTitle="Verified Directives"
    >
      <section className="verified-directives-page" style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
            Verified Directives
          </h1>
          <p style={{ color: '#6b7280' }}>
            View all directives that have been reviewed and verified
          </p>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              Total Verified
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600' }}>{stats.total}</div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              Approved
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#10b981' }}>
              {stats.approved}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              Rejected
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#ef4444' }}>
              {stats.rejected}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              Edited
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#f59e0b' }}>
              {stats.edited}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <Filter size={18} style={{ color: '#6b7280' }} />
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: filter === 'all' ? '#3b82f6' : '#f3f4f6',
              color: filter === 'all' ? 'white' : '#374151',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('approved')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: filter === 'approved' ? '#10b981' : '#f3f4f6',
              color: filter === 'approved' ? 'white' : '#374151',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Approved ({stats.approved})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: filter === 'rejected' ? '#ef4444' : '#f3f4f6',
              color: filter === 'rejected' ? 'white' : '#374151',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Rejected ({stats.rejected})
          </button>
          <button
            onClick={() => setFilter('edited')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: filter === 'edited' ? '#f59e0b' : '#f3f4f6',
              color: filter === 'edited' ? 'white' : '#374151',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Edited ({stats.edited})
          </button>
        </div>

        {/* Loading/Error States */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading verified directives...
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              padding: '16px',
              color: '#c33',
            }}
          >
            {error}
          </div>
        )}

        {/* Directives List */}
        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredDirectives.length === 0 ? (
              <div
                style={{
                  background: 'white',
                  padding: '40px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  textAlign: 'center',
                  color: '#6b7280',
                }}
              >
                No {filter !== 'all' ? filter : ''} directives found
              </div>
            ) : (
              filteredDirectives.map((directive) => (
                <div
                  key={directive.id}
                  style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    borderLeft: `4px solid ${getStatusColor(directive.verification_status)}`,
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '16px' }}>
                          {directive.case_id}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            background: `${getStatusColor(directive.verification_status)}20`,
                            color: getStatusColor(directive.verification_status),
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'capitalize',
                          }}
                        >
                          {getStatusIcon(directive.verification_status)}
                          {directive.verification_status}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                        {directive.court_name}
                      </div>
                    </div>
                  </div>

                  {/* Directive Text */}
                  <p
                    style={{
                      fontSize: '15px',
                      lineHeight: '1.6',
                      color: '#374151',
                      marginBottom: '16px',
                    }}
                  >
                    {directive.directive_text}
                  </p>

                  {/* Meta Info */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      paddingTop: '16px',
                      borderTop: '1px solid #e5e7eb',
                      fontSize: '14px',
                    }}
                  >
                    <div>
                      <span style={{ color: '#6b7280' }}>Department: </span>
                      <span style={{ fontWeight: '500' }}>
                        {directive.assigned_department || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Priority: </span>
                      <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                        {directive.priority}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Verified by: </span>
                      <span style={{ fontWeight: '500' }}>
                        {directive.verified_by || 'System'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Date: </span>
                      <span style={{ fontWeight: '500' }}>
                        {directive.verified_at
                          ? new Date(directive.verified_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Verification Notes */}
                  {directive.verification_notes && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: '#f9fafb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: '#6b7280',
                      }}
                    >
                      <strong>Notes:</strong> {directive.verification_notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </AppLayout>
  );
};

export default VerifiedDirectives;
