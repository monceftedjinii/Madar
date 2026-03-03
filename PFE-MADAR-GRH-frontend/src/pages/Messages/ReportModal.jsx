import { useState } from 'react';
import api from '../../api';

export default function ReportModal({ message, onClose, onSuccess, onBack }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const REPORT_REASONS = [
    { value: 'spam', label: '📧 Spam' },
    { value: 'harassment', label: '😠 Harassment' },
    { value: 'inappropriate', label: '⚠️ Inappropriate Content' },
    { value: 'other', label: '❓ Other' }
  ];

  const reportMessage = async () => {
    if (!reason) {
      setError('Please select a reason');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const formData = new FormData();
      formData.append('reason', reason);
      formData.append('details', details);

      await api.post(`/api/messages/${message.id}/report/`, formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to report message');
    } finally {
      setSending(false);
    }
  };

  const styles = {
    container: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#fff'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f9f9f9'
    },
    title: {
      margin: 0,
      fontSize: '16px',
      fontWeight: 'bold'
    },
    backBtn: {
      background: 'none',
      border: 'none',
      fontSize: '16px',
      cursor: 'pointer',
      color: '#007bff',
      fontWeight: 'bold'
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      margin: '0 0 8px',
      fontWeight: '600',
      fontSize: '13px',
      color: '#333'
    },
    radioGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    radioOption: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '4px',
      transition: 'background 0.2s'
    },
    radioInput: {
      cursor: 'pointer'
    },
    textarea: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '13px',
      fontFamily: 'inherit',
      resize: 'vertical',
      minHeight: '100px'
    },
    messageInfo: {
      padding: '10px',
      backgroundColor: '#f9f9f9',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '12px',
      marginBottom: '15px'
    },
    errorMsg: {
      padding: '10px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '13px'
    },
    footer: {
      display: 'flex',
      gap: '10px',
      padding: '15px 20px',
      borderTop: '1px solid #e0e0e0',
      backgroundColor: '#f9f9f9'
    },
    btn: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'background 0.2s'
    },
    primaryBtn: {
      backgroundColor: '#dc3545',
      color: 'white'
    },
    cancelBtn: {
      backgroundColor: '#e0e0e0',
      color: '#333'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>⚠️ Report Message</h2>
        <button style={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
      </div>

      <div style={styles.content}>
        {error && <div style={styles.errorMsg}>❌ {error}</div>}

        <div style={styles.messageInfo}>
          <strong>Message from:</strong> {message.sender.name}<br />
          <strong>Subject:</strong> {message.subject}<br />
          <strong>Sent:</strong> {new Date(message.created_at).toLocaleString()}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Reason for reporting:</label>
          <div style={styles.radioGroup}>
            {REPORT_REASONS.map((opt) => (
              <label
                key={opt.value}
                style={{
                  ...styles.radioOption,
                  backgroundColor: reason === opt.value ? '#e3f2fd' : 'transparent'
                }}
              >
                <input
                  type="radio"
                  style={styles.radioInput}
                  name="reason"
                  value={opt.value}
                  checked={reason === opt.value}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={sending}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Additional details (optional):</label>
          <textarea
            style={styles.textarea}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Please provide any additional details about why you're reporting this message..."
            disabled={sending}
          />
        </div>
      </div>

      <div style={styles.footer}>
        <button
          style={{ ...styles.btn, ...styles.primaryBtn }}
          onClick={reportMessage}
          disabled={sending}
        >
          {sending ? 'Submitting...' : 'Submit Report'}
        </button>
        <button
          style={{ ...styles.btn, ...styles.cancelBtn }}
          onClick={onClose}
          disabled={sending}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
