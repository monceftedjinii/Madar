import { useState, useEffect } from 'react';
import api from '../../api';

export default function ReplyModal({ originalMessage, isForward = false, onClose, onSuccess, onBack }) {
  const [recipientId, setRecipientId] = useState(isForward ? null : originalMessage.sender.id);
  const [body, setBody] = useState('');
  const [employees, setEmployees] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isForward) {
      fetchEmployees();
    }
  }, [isForward]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/employees/');
      setEmployees(response.data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const sendMessage = async () => {
    if (!body.trim()) {
      setError('Message body cannot be empty');
      return;
    }

    if (isForward && !recipientId) {
      setError('Please select a recipient');
      return;
    }

    try {
      setSending(true);
      setError(null);

      if (isForward) {
        // Forward: create new message with quoted original
        const quotedBody = `\n\n--- Forwarded Message ---\nFrom: ${originalMessage.sender.name}\nDate: ${new Date(originalMessage.created_at).toLocaleString()}\n\n${originalMessage.body}`;
        
        const formData = new FormData();
        formData.append('recipient_id', recipientId);
        formData.append('subject', `Fwd: ${originalMessage.subject}`);
        formData.append('body', body + quotedBody);

        await api.post('/api/messages/send/', formData);
      } else {
        // Reply: use reply endpoint
        const formData = new FormData();
        formData.append('body', body);

        await api.post(`/api/messages/${originalMessage.id}/reply/`, formData);
      }

      onSuccess();
    } catch (err) {
      if (err.response?.status === 403) {
        setError('User has blocked you');
      } else {
        setError(err.response?.data?.detail || `Failed to ${isForward ? 'forward' : 'reply to'} message`);
      }
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
      margin: '0 0 5px',
      fontWeight: '600',
      fontSize: '13px',
      color: '#333'
    },
    select: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '13px',
      fontFamily: 'inherit'
    },
    textarea: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '13px',
      fontFamily: 'monospace',
      resize: 'vertical',
      minHeight: '150px'
    },
    QuotedBox: {
      backgroundColor: '#f9f9f9',
      border: '1px solid #ddd',
      borderLeft: '3px solid #007bff',
      padding: '10px',
      margin: '15px 0',
      fontSize: '12px',
      color: '#666',
      borderRadius: '3px'
    },
    quotedHeader: {
      margin: '0 0 8px',
      fontWeight: 'bold',
      fontSize: '11px'
    },
    quotedBody: {
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word'
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
      backgroundColor: '#007bff',
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
        <h2 style={styles.title}>
          {isForward ? '↩️ Forward Message' : '💬 Reply to Message'}
        </h2>
        <button style={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
      </div>

      <div style={styles.content}>
        {error && <div style={styles.errorMsg}>⚠️ {error}</div>}

        {isForward && (
          <div style={styles.formGroup}>
            <label style={styles.label}>To:</label>
            <select
              style={styles.select}
              value={recipientId || ''}
              onChange={(e) => setRecipientId(parseInt(e.target.value))}
            >
              <option value="">-- Select recipient --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.email})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Your {isForward ? 'message' : 'reply'}:</label>
          <textarea
            style={styles.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isForward ? 'Enter your message...' : 'Type your reply here...'}
            disabled={sending}
          />
        </div>

        {!isForward && (
          <div style={styles.QuotedBox}>
            <div style={styles.quotedHeader}>
              Original message from {originalMessage.sender.name}:
            </div>
            <div style={styles.quotedBody}>
              {originalMessage.body}
            </div>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button
          style={{ ...styles.btn, ...styles.primaryBtn }}
          onClick={sendMessage}
          disabled={sending}
        >
          {sending ? 'Sending...' : (isForward ? 'Forward' : 'Reply')}
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
