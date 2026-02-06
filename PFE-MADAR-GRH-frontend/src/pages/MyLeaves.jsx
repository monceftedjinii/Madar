import { useState, useEffect } from 'react';
import api from '../api';

export default function MyLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    type: 'ANNUAL',
    reason: '',
    attachment: null
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/leaves/me/');
      setLeaves(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        attachment: files?.[0] || null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    if (success) setSuccess(null);
  };

  // Helper to convert various date formats to YYYY-MM-DD
  const toISODate = (value) => {
    if (!value) return value;
    if (value.includes('-')) return value; // already YYYY-MM-DD
    const parts = value.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    return value;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate dates
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      setError('Start date must be before end date');
      return;
    }

    // Check attachment for SICK type
    if (formData.type === 'SICK' && !formData.attachment) {
      setError('Attachment is required for SICK leave');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('start_date', toISODate(formData.start_date));
      data.append('end_date', toISODate(formData.end_date));
      data.append('type', formData.type);
      data.append('reason', formData.reason);
      if (formData.attachment) {
        data.append('attachment', formData.attachment);
      }

      await api.post('/api/leaves/', data);
      setSuccess('Leave request submitted successfully');
      setFormData({
        start_date: '',
        end_date: '',
        type: 'ANNUAL',
        reason: '',
        attachment: null
      });

      // Refetch after 1 second
      setTimeout(() => fetchLeaves(), 1000);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.log('submit leave status', err.response?.status);
      console.log('submit leave data', err.response?.data);
      setError(
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        'Failed to submit leave request'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: '#fff3cd',
      APPROVED: '#d4edda',
      REJECTED: '#f8d7da'
    };
    const textColors = {
      PENDING: '#856404',
      APPROVED: '#155724',
      REJECTED: '#721c24'
    };
    return { bg: colors[status] || '#f5f5f5', text: textColors[status] || '#333' };
  };

  const styles = {
    container: {
      maxWidth: '1200px',
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
    successBanner: {
      backgroundColor: '#e6f7e6',
      color: '#065706',
      border: '1px solid #a9d8a9'
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
      display: 'grid',
      gap: '30px'
    },
    sectionCard: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 15px 0'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '6px'
    },
    required: {
      color: '#c33'
    },
    input: {
      width: '100%',
      padding: '8px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontFamily: 'inherit'
    },
    select: {
      width: '100%',
      padding: '8px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontFamily: 'inherit'
    },
    textarea: {
      width: '100%',
      padding: '8px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      minHeight: '80px',
      resize: 'vertical'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '15px'
    },
    submitButton: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 'bold'
    },
    submitButtonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    resetButton: {
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px'
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
    leaveHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '10px'
    },
    leaveTitle: {
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#333'
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '3px',
      fontSize: '11px',
      fontWeight: 'bold'
    },
    leaveBody: {
      fontSize: '13px',
      color: '#666',
      lineHeight: '1.6'
    },
    loadingMessage: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#666'
    },
    emptyMessage: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#999',
      fontSize: '14px'
    }
  };

  if (loading) {
    return <div style={styles.container}><div style={styles.loadingMessage}>Loading leaves...</div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Leave Requests</h1>
        <p style={styles.subtitle}>Total: {leaves.length} | Pending: {leaves.filter(l => l.status === 'PENDING').length}</p>
      </div>

      {error && (
        <div style={{...styles.alertBanner, ...styles.errorBanner}}>
          <span>{error}</span>
          <button style={styles.closeButton} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div style={{...styles.alertBanner, ...styles.successBanner}}>
          <span>{success}</span>
          <button style={styles.closeButton} onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      <div style={styles.section}>
        {/* Create Leave Form */}
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Create Leave Request</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Start Date <span style={styles.required}>*</span></label>
                <input
                  style={styles.input}
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>End Date <span style={styles.required}>*</span></label>
                <input
                  style={styles.input}
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Leave Type <span style={styles.required}>*</span></label>
                <select
                  style={styles.select}
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {formData.type === 'SICK' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Attachment <span style={styles.required}>*</span></label>
                  <input
                    style={styles.input}
                    type="file"
                    name="attachment"
                    onChange={handleInputChange}
                  />
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Reason <span style={styles.required}>*</span></label>
              <textarea
                style={styles.textarea}
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="Explain your leave request"
                required
              />
            </div>

            <div style={styles.buttonGroup}>
              <button
                style={{...styles.submitButton, ...(submitting ? styles.submitButtonDisabled : {})}}
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                style={styles.resetButton}
                type="reset"
                onClick={() => {
                  setFormData({
                    start_date: '',
                    end_date: '',
                    type: 'ANNUAL',
                    reason: '',
                    attachment: null
                  });
                  setError(null);
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Leaves List */}
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Leave History</h2>
          {leaves.length === 0 ? (
            <div style={styles.emptyMessage}>No leave requests yet</div>
          ) : (
            <div style={styles.leavesList}>
              {leaves.map(leave => {
                const statusColor = getStatusColor(leave.status);
                return (
                  <div key={leave.id} style={styles.leaveCard}>
                    <div style={styles.leaveHeader}>
                      <div style={styles.leaveTitle}>
                        {leave.type === 'ANNUAL' && '📅 Annual Leave'}
                        {leave.type === 'SICK' && '🏥 Sick Leave'}
                        {leave.type === 'OTHER' && '📝 Other Leave'}
                      </div>
                      <div
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: statusColor.bg,
                          color: statusColor.text
                        }}
                      >
                        {leave.status}
                      </div>
                    </div>
                    <div style={styles.leaveBody}>
                      <div><strong>Dates:</strong> {new Date(leave.start_date).toLocaleDateString()} → {new Date(leave.end_date).toLocaleDateString()}</div>
                      <div><strong>Days:</strong> {(new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24) + 1}</div>
                      <div><strong>Reason:</strong> {leave.reason}</div>
                      {leave.chef_comment && <div><strong>Chef Comment:</strong> {leave.chef_comment}</div>}
                      {leave.submitted_at && <div style={{ fontSize: '12px', color: '#999' }}>Submitted: {new Date(leave.submitted_at).toLocaleDateString()}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
