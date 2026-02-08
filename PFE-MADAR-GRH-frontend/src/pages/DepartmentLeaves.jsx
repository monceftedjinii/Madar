import { useState, useEffect } from 'react';
import api from '../api';

export default function DepartmentLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null); // tracks which leave is being processed
  const [commentInputs, setCommentInputs] = useState({}); // stores comment for each leave
  const [expandedLeave, setExpandedLeave] = useState(null); // which leave has expanded action buttons
  const [searchInput, setSearchInput] = useState('');
  const [fromDateInput, setFromDateInput] = useState('');
  const [toDateInput, setToDateInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Log first leave object from API response for debugging structure
  useEffect(() => {
    if (leaves && leaves.length > 0) console.log('leaves[0]', leaves[0]);
  }, [leaves]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/leaves/department/');
      console.log('leaves', response.data);
      setLeaves(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      setActionInProgress(leaveId);
      const comment = commentInputs[leaveId] || '';
      await api.post(`/api/leaves/${leaveId}/approve/`, { comment });

      // Update local state
      setLeaves(leaves.map(leave =>
        leave.id === leaveId ? { ...leave, status: 'ACCEPTED' } : leave
      ));
      setCommentInputs(prev => ({ ...prev, [leaveId]: '' }));
      setExpandedLeave(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve leave');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (leaveId) => {
    try {
      setActionInProgress(leaveId);
      const comment = commentInputs[leaveId] || '';
      await api.post(`/api/leaves/${leaveId}/reject/`, { comment });

      // Update local state
      setLeaves(leaves.map(leave =>
        leave.id === leaveId ? { ...leave, status: 'REFUSED' } : leave
      ));
      setCommentInputs(prev => ({ ...prev, [leaveId]: '' }));
      setExpandedLeave(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject leave');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCommentChange = (leaveId, value) => {
    setCommentInputs(prev => ({ ...prev, [leaveId]: value }));
  };

  const applyFilters = () => {
    setSearchTerm(searchInput.trim());
    setFromDate(fromDateInput);
    setToDate(toDateInput);
  };

  const getStatusColor = (status) => {
    const normalizedStatus = String(status || '').toUpperCase();
    const colors = {
      PENDING: '#fff3cd',
      ACCEPTED: '#d4edda',
      REFUSED: '#f8d7da',
      UNKNOWN: '#e2e3e5'
    };
    const textColors = {
      PENDING: '#856404',
      ACCEPTED: '#155724',
      REFUSED: '#721c24',
      UNKNOWN: '#383d41'
    };
    return { bg: colors[normalizedStatus] || '#f5f5f5', text: textColors[normalizedStatus] || '#333' };
  };

  // Normalize status and group leaves (check multiple possible fields)
  const normalizeStatus = (leave) => {
    const raw = (leave && (leave.status ?? leave.state ?? leave.leave_status ?? leave.etat ?? leave.status_display ?? leave.decision ?? (leave.employee && leave.employee.status))) || '';
    const normalized = String(raw).toUpperCase();

    if (['PENDING', 'WAITING', 'AWAITING'].includes(normalized)) return 'PENDING';
    if (['ACCEPTED', 'APPROVED', 'OK'].includes(normalized)) return 'ACCEPTED';
    if (['REFUSED', 'REJECTED', 'DENIED'].includes(normalized)) return 'REFUSED';
    if (['PENDING', 'ACCEPTED', 'REFUSED'].includes(normalized)) return normalized;

    return 'UNKNOWN';
  };

  const filteredLeaves = leaves.filter((leave) => {
    const term = searchTerm.toLowerCase();
    if (term) {
      const email = leave?.employee_email || leave?.employee?.email || leave?.employee?.user?.email || '';
      const first = leave?.employee?.first_name || leave?.employee?.user?.first_name || '';
      const last = leave?.employee?.last_name || leave?.employee?.user?.last_name || '';
      const reason = leave?.reason || '';
      const haystack = `${first} ${last} ${email} ${reason}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    if (fromDate || toDate) {
      const start = leave?.start_date ? new Date(leave.start_date) : null;
      const end = leave?.end_date ? new Date(leave.end_date) : null;
      if (fromDate) {
        const from = new Date(fromDate);
        if (end && end < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        if (start && start > to) return false;
      }
    }

    return true;
  });

  const pendingLeaves = filteredLeaves.filter(l => normalizeStatus(l) === 'PENDING');
  const acceptedLeaves = filteredLeaves.filter(l => normalizeStatus(l) === 'ACCEPTED');
  const refusedLeaves = filteredLeaves.filter(l => normalizeStatus(l) === 'REFUSED');

  // Helper to render employee label with fallbacks
  const getEmployeeLabel = (leave) => {
    const email = leave?.employee_email || leave?.employee?.email || leave?.employee?.user?.email;
    const first = leave?.employee?.first_name || leave?.employee?.user?.first_name;
    const last = leave?.employee?.last_name || leave?.employee?.user?.last_name;
    const name = [first, last].filter(Boolean).join(' ').trim();
    if (name && email) return `${name} (${email})`;
    if (name) return name;
    if (email) return email;
    return 'Unknown';
  };

  const styles = {
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      marginBottom: '30px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 10px 0'
    },
    subtitle: {
      fontSize: '14px',
      color: '#666'
    },
    filterRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 160px 160px 120px',
      gap: '10px',
      alignItems: 'end',
      marginBottom: '20px'
    },
    filterLabel: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '5px'
    },
    filterInput: {
      padding: '8px',
      fontSize: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      width: '100%',
      boxSizing: 'border-box'
    },
    filterButton: {
      padding: '8px 12px',
      fontSize: '12px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    alertBanner: {
      padding: '12px 16px',
      borderRadius: '4px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    errorBanner: {
      backgroundColor: '#ffe6e6',
      color: '#c33',
      border: '1px solid #f5a9a9'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '18px',
      color: 'inherit',
      padding: '0'
    },
    section: {
      marginBottom: '30px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 15px 0',
      paddingBottom: '10px',
      borderBottom: '2px solid #ddd'
    },
    leavesList: {
      display: 'grid',
      gap: '12px'
    },
    leaveCard: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '15px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    leaveCardDisabled: {
      opacity: 0.7
    },
    leaveHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '10px'
    },
    leaveTitle: {
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#333',
      flex: 1
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '3px',
      fontSize: '11px',
      fontWeight: 'bold',
      marginLeft: '10px'
    },
    leaveBody: {
      fontSize: '13px',
      color: '#666',
      lineHeight: '1.6',
      marginBottom: '10px'
    },
    actionSection: {
      marginTop: '10px',
      paddingTop: '10px',
      borderTop: '1px solid #eee'
    },
    commentInput: {
      width: '100%',
      padding: '8px',
      fontSize: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      minHeight: '60px',
      resize: 'vertical',
      marginBottom: '10px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px'
    },
    approveButton: {
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      padding: '7px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 'bold'
    },
    approveButtonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    rejectButton: {
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      padding: '7px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 'bold'
    },
    rejectButtonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    cancelButton: {
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      padding: '7px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    loadingMessage: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#666'
    },
    emptyMessage: {
      textAlign: 'center',
      padding: '30px 20px',
      color: '#999',
      fontSize: '14px',
      backgroundColor: '#f9f9f9',
      borderRadius: '4px'
    }
  };

  if (loading) {
    return <div style={styles.container}><div style={styles.loadingMessage}>Loading leaves...</div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Department Leave Requests</h1>
        <p style={styles.subtitle}>
          Total: {leaves.length} | Pending: {pendingLeaves.length} | Accepted: {acceptedLeaves.length} | Refused: {refusedLeaves.length}
        </p>
      </div>

      <div style={styles.filterRow}>
        <div>
          <label style={styles.filterLabel}>Search</label>
          <input
            style={styles.filterInput}
            type="text"
            placeholder="Search name, email, reason"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div>
          <label style={styles.filterLabel}>From Date</label>
          <input
            style={styles.filterInput}
            type="date"
            value={fromDateInput}
            onChange={(e) => setFromDateInput(e.target.value)}
          />
        </div>
        <div>
          <label style={styles.filterLabel}>To Date</label>
          <input
            style={styles.filterInput}
            type="date"
            value={toDateInput}
            onChange={(e) => setToDateInput(e.target.value)}
          />
        </div>
        <button style={styles.filterButton} onClick={applyFilters}>
          Search
        </button>
      </div>

      {error && (
        <div style={{...styles.alertBanner, ...styles.errorBanner}}>
          <span>{error}</span>
          <button style={styles.closeButton} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Pending Leaves */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Pending Approval ({pendingLeaves.length})</h2>
        {pendingLeaves.length === 0 ? (
          <div style={styles.emptyMessage}>No pending leave requests</div>
        ) : (
          <div style={styles.leavesList}>
            {pendingLeaves.map(leave => (
              <div
                key={leave.id}
                style={{
                  ...styles.leaveCard,
                  ...(actionInProgress === leave.id ? styles.leaveCardDisabled : {})
                }}
              >
                <div style={styles.leaveHeader}>
                  <div>
                    <div style={styles.leaveTitle}>
                      {getEmployeeLabel(leave)}
                    </div>
                  </div>
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(normalizeStatus(leave)).bg,
                      color: getStatusColor(normalizeStatus(leave)).text
                    }}
                  >
                    {normalizeStatus(leave)}
                  </div>
                </div>
                <div style={styles.leaveBody}>
                  <div><strong>Type:</strong> {leave.type === 'ANNUAL' ? '📅 Annual' : leave.type === 'SICK' ? '🏥 Sick' : '📝 Other'}</div>
                  <div><strong>Dates:</strong> {new Date(leave.start_date).toLocaleDateString()} → {new Date(leave.end_date).toLocaleDateString()}</div>
                  <div><strong>Days:</strong> {(new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24) + 1}</div>
                  <div><strong>Reason:</strong> {leave.reason}</div>
                  {leave.attachment && <div><strong>Attachment:</strong> <a href={leave.attachment} target="_blank" rel="noopener noreferrer">View file</a></div>}
                </div>

                {expandedLeave === leave.id ? (
                  <div style={styles.actionSection}>
                    <textarea
                      style={styles.commentInput}
                      placeholder="Add a comment (optional)"
                      value={commentInputs[leave.id] || ''}
                      onChange={(e) => handleCommentChange(leave.id, e.target.value)}
                    />
                    <div style={styles.buttonGroup}>
                      <button
                        style={{...styles.approveButton, ...(actionInProgress === leave.id ? styles.approveButtonDisabled : {})}}
                        onClick={() => handleApprove(leave.id)}
                        disabled={actionInProgress === leave.id}
                      >
                        {actionInProgress === leave.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        style={{...styles.rejectButton, ...(actionInProgress === leave.id ? styles.rejectButtonDisabled : {})}}
                        onClick={() => handleReject(leave.id)}
                        disabled={actionInProgress === leave.id}
                      >
                        {actionInProgress === leave.id ? 'Processing...' : 'Reject'}
                      </button>
                      <button
                        style={styles.cancelButton}
                        onClick={() => {
                          setExpandedLeave(null);
                          setCommentInputs(prev => ({ ...prev, [leave.id]: '' }));
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={styles.actionSection}>
                    <button
                      style={styles.approveButton}
                      onClick={() => setExpandedLeave(leave.id)}
                    >
                      Review & Decide
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accepted Leaves */}
      {acceptedLeaves.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Accepted ({acceptedLeaves.length})</h2>
          <div style={styles.leavesList}>
            {acceptedLeaves.map(leave => (
              <div key={leave.id} style={styles.leaveCard}>
                <div style={styles.leaveHeader}>
                  <div style={styles.leaveTitle}>
                    {getEmployeeLabel(leave)}
                  </div>
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(normalizeStatus(leave)).bg,
                      color: getStatusColor(normalizeStatus(leave)).text
                    }}
                  >
                    {normalizeStatus(leave)}
                  </div>
                </div>
                <div style={styles.leaveBody}>
                  <div><strong>Type:</strong> {leave.type === 'ANNUAL' ? '📅 Annual' : leave.type === 'SICK' ? '🏥 Sick' : '📝 Other'}</div>
                  <div><strong>Dates:</strong> {new Date(leave.start_date).toLocaleDateString()} → {new Date(leave.end_date).toLocaleDateString()}</div>
                  {leave.chef_comment && <div><strong>Your Comment:</strong> {leave.chef_comment}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refused Leaves */}
      {refusedLeaves.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Refused ({refusedLeaves.length})</h2>
          <div style={styles.leavesList}>
            {refusedLeaves.map(leave => (
              <div key={leave.id} style={styles.leaveCard}>
                <div style={styles.leaveHeader}>
                  <div style={styles.leaveTitle}>
                    {getEmployeeLabel(leave)}
                  </div>
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(normalizeStatus(leave)).bg,
                      color: getStatusColor(normalizeStatus(leave)).text
                    }}
                  >
                    {normalizeStatus(leave)}
                  </div>
                </div>
                <div style={styles.leaveBody}>
                  <div><strong>Type:</strong> {leave.type === 'ANNUAL' ? '📅 Annual' : leave.type === 'SICK' ? '🏥 Sick' : '📝 Other'}</div>
                  <div><strong>Dates:</strong> {new Date(leave.start_date).toLocaleDateString()} → {new Date(leave.end_date).toLocaleDateString()}</div>
                  {leave.chef_comment && <div><strong>Reason:</strong> {leave.chef_comment}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
    </div>
  );
}
