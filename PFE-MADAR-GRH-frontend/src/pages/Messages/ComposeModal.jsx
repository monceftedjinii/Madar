import { useState, useEffect } from 'react';
import api from '../../api';

export default function ComposeModal({ onClose, onSent, onComposed }) {
  const [recipients, setRecipients] = useState([]);
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    try {
      const response = await api.get('/api/employees/?for_messaging=true');
      setRecipients(response.data || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setError('Failed to load recipients');
    }
  };

  const getRecipientName = (emp) => {
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    return name || emp.email;
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles]);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    const file = files[index];
    setFiles(files.filter((_, i) => i !== index));
    setSelectedFiles(selectedFiles.filter(f => f !== file));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const saveDraft = async () => {
    if (!subject.trim() && !body.trim() && files.length === 0) {
      setError('Draft cannot be empty');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.post('/api/messages/save-draft/', {
        recipient_id: recipientId || null,
        subject: subject.trim(),
        body: body.trim()
      });
      setSuccess('Draft saved successfully');
      setTimeout(() => {
        onComposed();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async () => {
    if (!recipientId) {
      setError('Please select a recipient');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!body.trim()) {
      setError('Message body is required');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const formData = new FormData();
      formData.append('recipient_id', recipientId);
      formData.append('subject', subject.trim());
      formData.append('body', body.trim());
      
      files.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await api.post('/api/messages/send/', formData);

      if (response.data.success) {
        const attachmentCount = response.data.attachments_count || 0;
        const msg = attachmentCount > 0 
          ? `Message sent successfully with ${attachmentCount} attachment(s)!`
          : 'Message sent successfully!';
        setSuccess(msg);
        console.log('Message sent response:', response.data);
        setTimeout(() => {
          onSent();
        }, 1000);
      }
    } catch (err) {
        const detail = err.response?.data?.detail;
        const attachmentErrors = err.response?.data?.attachment_errors;
        let errorMsg = detail || 'Failed to send message';
        if (attachmentErrors && attachmentErrors.length > 0) {
          errorMsg += '\n\nAttachment errors:\n' + attachmentErrors.join('\n');
        }
        setError(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px',
      borderBottom: '1px solid #e0e0e0'
    },
    headerTitle: {
      margin: 0,
      fontSize: '18px',
      color: '#333'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#666'
    },
    body: {
      padding: '20px',
      overflow: 'y: auto;',
      flex: 1
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      fontWeight: 500,
      marginBottom: '5px',
      color: '#333',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '14px',
      boxSizing: 'border-box',
      resize: 'vertical',
      minHeight: '200px'
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    fileLabel: {
      display: 'inline-block',
      padding: '8px 12px',
      backgroundColor: '#007bff',
      color: 'white',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500
    },
    fileInput: {
      display: 'none'
    },
    fileList: {
      marginTop: '10px'
    },
    fileItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 10px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      marginBottom: '5px',
      fontSize: '13px'
    },
    removeFileBtn: {
      background: '#dc3545',
      color: 'white',
      border: 'none',
      padding: '2px 8px',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    footer: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      padding: '15px 20px',
      borderTop: '1px solid #e0e0e0'
    },
    btn: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 500,
      fontSize: '14px',
      transition: 'all 0.2s'
    },
    primaryBtn: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    secondaryBtn: {
      backgroundColor: '#6c757d',
      color: 'white'
    },
    tertiaryBtn: {
      backgroundColor: '#28a745',
      color: 'white'
    },
    errorMsg: {
      padding: '12px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '13px'
    },
    successMsg: {
      padding: '12px',
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '13px'
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>✉️ New Message</h2>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={{ ...styles.body, overflowY: 'auto' }}>
          {error && <div style={styles.errorMsg}>⚠️ {error}</div>}
          {success && <div style={styles.successMsg}>✓ {success}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>To:</label>
            <select
              style={styles.select}
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
            >
              <option value="">Select a recipient...</option>
              {recipients.map((emp) => (
                <option key={emp.id} value={emp.user_id || emp.id}>
                  {getRecipientName(emp)} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Subject:</label>
            <input
              type="text"
              style={styles.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject..."
              disabled={sending || saving}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Message:</label>
            <textarea
              style={styles.textarea}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              disabled={sending || saving}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Attachments (max 10MB per file):</label>
            <div>
              <label style={styles.fileLabel}>
                📎 Choose Files
                <input
                  type="file"
                  style={styles.fileInput}
                  onChange={handleFileChange}
                  multiple
                  disabled={sending || saving}
                />
              </label>
            </div>
            
            {files.length > 0 && (
              <div style={styles.fileList}>
                {files.map((file, idx) => (
                  <div key={idx} style={styles.fileItem}>
                    <span>📄 {file.name} ({formatFileSize(file.size)})</span>
                    <button
                      style={styles.removeFileBtn}
                      onClick={() => removeFile(idx)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <button
            style={{ ...styles.btn, ...styles.secondaryBtn }}
            onClick={saveDraft}
            disabled={sending || saving}
          >
            {saving ? 'Saving...' : '💾 Save Draft'}
          </button>
          <button
            style={{ ...styles.btn, ...styles.secondaryBtn }}
            onClick={onClose}
            disabled={sending || saving}
          >
            Cancel
          </button>
          <button
            style={{ ...styles.btn, ...styles.primaryBtn }}
            onClick={sendMessage}
            disabled={sending || saving}
          >
            {sending ? 'Sending...' : '✉️ Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
