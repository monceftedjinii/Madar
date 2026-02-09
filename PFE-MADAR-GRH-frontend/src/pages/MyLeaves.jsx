import { useState, useEffect } from 'react';
import api from '../api';

export default function MyLeaves() {
    // Block leave request if employee has pending or ongoing accepted leave
    const [blockedReason, setBlockedReason] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exportType, setExportType] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    type: 'ANNUAL',
    reason: '',
    attachment: null
  });

  useEffect(() => {
    fetchLeaves();
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setExportFromDate(firstDay.toISOString().split('T')[0]);
    setExportToDate(today.toISOString().split('T')[0]);
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/leaves/me/');
      setLeaves(response.data);
      // Check for blocking conditions
      const today = new Date();
      let blocked = null;
      for (const leave of response.data) {
        if (leave.status === 'PENDING') {
          blocked = 'You already have a pending leave request.';
          break;
        }
        if (leave.status === 'ACCEPTED') {
          const endDate = new Date(leave.end_date);
          if (endDate >= today) {
            blocked = `You have an ongoing approved leave until ${leave.end_date}.`;
            break;
          }
        }
      }
      setBlockedReason(blocked);
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

      console.log([...data.entries()]);

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
      // Show backend error message clearly
      const detail = err.response?.data?.detail || err.response?.data?.error;
      setError(detail || JSON.stringify(err.response?.data) || 'Failed to submit leave request');
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

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportError(null);
      const response = await api.get('/api/reports/leaves/export/', {
        params: {
          from: exportFromDate,
          to: exportToDate,
          status: exportStatus || undefined,
          type: exportType || undefined,
          file_format: exportFormat
        },
        responseType: 'blob'
      });
      const ext = exportFormat === 'xlsx' ? 'xlsx' : 'pdf';
      const filename = `leave_report_${exportFromDate}_${exportToDate}.${ext}`;
      downloadBlob(response.data, filename);
      setExportOpen(false);
    } catch (err) {
      setExportError('Failed to export leave history');
    } finally {
      setExporting(false);
    }
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
    headerActions: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px'
    },
    exportButton: {
      padding: '8px 14px',
      fontSize: '13px',
      fontWeight: 'bold',
      backgroundColor: '#17a2b8',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    exportButtonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      width: '360px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
    },
    modalTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '12px',
      color: '#333'
    },
    modalField: {
      marginBottom: '12px'
    },
    modalLabel: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '6px'
    },
    modalInput: {
      width: '100%',
      padding: '8px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box'
    },
    modalActions: {
      display: 'flex',
      gap: '10px',
      marginTop: '10px'
    },
    modalButton: {
      flex: 1,
      padding: '8px 12px',
      fontSize: '12px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer'
    },
    modalConfirm: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    modalCancel: {
      backgroundColor: '#6c757d',
      color: 'white'
    },
    modalError: {
      marginTop: '6px',
      color: '#c33',
      fontSize: '12px'
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
        <div style={styles.headerActions}>
          <div>
            <h1 style={styles.title}>My Leave Requests</h1>
            <p style={styles.subtitle}>Total: {leaves.length} | Pending: {leaves.filter(l => l.status === 'PENDING').length}</p>
          </div>
          <button
            style={{...styles.exportButton, ...(exporting ? styles.exportButtonDisabled : {})}}
            onClick={() => {
              setExportOpen(true);
              setExportError(null);
            }}
            disabled={exporting}
          >
            Export
          </button>
        </div>
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

      {exportOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalTitle}>Export Leave History</div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>From Date</label>
              <input
                style={styles.modalInput}
                type="date"
                value={exportFromDate}
                onChange={(e) => setExportFromDate(e.target.value)}
              />
            </div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>To Date</label>
              <input
                style={styles.modalInput}
                type="date"
                value={exportToDate}
                onChange={(e) => setExportToDate(e.target.value)}
              />
            </div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Status</label>
              <select
                style={styles.modalInput}
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REFUSED">Refused</option>
              </select>
            </div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Leave Type</label>
              <select
                style={styles.modalInput}
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
              >
                <option value="">All</option>
                <option value="ANNUAL">Annual</option>
                <option value="SICK">Sick</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Format</label>
              <select
                style={styles.modalInput}
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="pdf">PDF</option>
                <option value="xlsx">Excel</option>
              </select>
            </div>
            {exportError && <div style={styles.modalError}>{exportError}</div>}
            <div style={styles.modalActions}>
              <button
                style={{
                  ...styles.modalButton,
                  ...styles.modalConfirm,
                  ...(exporting ? styles.exportButtonDisabled : {})
                }}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : 'Download'}
              </button>
              <button
                style={{
                  ...styles.modalButton,
                  ...styles.modalCancel
                }}
                onClick={() => setExportOpen(false)}
                disabled={exporting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.section}>
        {/* Create Leave Form */}
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Create Leave Request</h2>
          {blockedReason && (
            <div style={{...styles.alertBanner, ...styles.errorBanner}}>
              <span>{blockedReason}</span>
            </div>
          )}
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
                  disabled={!!blockedReason}
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
                  disabled={!!blockedReason}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Leave Type <span style={styles.required}>*</span></label>
                <select
                  style={styles.select}
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  disabled={!!blockedReason}
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
                    disabled={!!blockedReason}
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
                disabled={!!blockedReason}
              />
            </div>

            <div style={styles.buttonGroup}>
              <button
                style={{...styles.submitButton, ...(submitting || blockedReason ? styles.submitButtonDisabled : {})}}
                type="submit"
                disabled={submitting || !!blockedReason}
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
                disabled={!!blockedReason}
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
                      {(leave.status === 'ACCEPTED' || leave.status === 'REFUSED') && leave.chef_comment && (
                        <div><strong>Chef Comment:</strong> {leave.chef_comment}</div>
                      )}
                      {(leave.status === 'ACCEPTED' || leave.status === 'REFUSED') && leave.decided_at && (
                        <div style={{ fontSize: '12px', color: '#999' }}>Decided: {new Date(leave.decided_at).toLocaleDateString()}</div>
                      )}
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
