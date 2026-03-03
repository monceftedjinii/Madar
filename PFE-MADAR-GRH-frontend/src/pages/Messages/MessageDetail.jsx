import { useState } from 'react';
import api from '../../api';
import ReplyModal from './ReplyModal';
import ReportModal from './ReportModal';

export default function MessageDetail({ message, onBack, onDelete, onRefresh }) {
  const [isReplying, setIsReplying] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [replies, setReplies] = useState([]);

  const deleteMessage = async () => {
    if (!window.confirm('Delete this message?')) return;

    try {
      setDeleting(true);
      await api.delete(`/api/messages/${message.id}/delete/`);
      setSuccess('Message deleted');
      setTimeout(() => {
        onDelete();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete message');
    } finally {
      setDeleting(false);
    }
  };

  const blockSender = async () => {
    if (!window.confirm(`Block ${message.sender.name}? They won't be able to send you messages.`)) return;

    try {
      await api.post(`/api/users/${message.sender.id}/block/`);
      setSuccess('User blocked');
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to block user');
    }
  };

  const handleReplySuccess = () => {
    setIsReplying(false);
    setSuccess('Reply sent!');
    setTimeout(() => {
      onRefresh();
    }, 1000);
  };

  const handleForwardSuccess = () => {
    setIsForwarding(false);
    setSuccess('Message forwarded!');
    setTimeout(() => {
      onBack();
    }, 1000);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const styles = {
    container: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#fff',
      overflow: 'hidden'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f9f9f9'
    },
    backBtn: {
      background: 'none',
      border: 'none',
      fontSize: '16px',
      cursor: 'pointer',
      color: '#007bff',
      fontWeight: 'bold'
    },
    actions: {
      display: 'flex',
      gap: '8px'
    },
    btn: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'background 0.2s'
    },
    primaryBtn: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    warningBtn: {
      backgroundColor: '#ffc107',
      color: '#333'
    },
    dangerBtn: {
      backgroundColor: '#dc3545',
      color: 'white'
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '20px'
    },
    messageInfo: {
      padding: '15px',
      backgroundColor: '#f9f9f9',
      borderRadius: '4px',
      marginBottom: '20px',
      fontSize: '14px'
    },
    infoRow: {
      display: 'flex',
      marginBottom: '8px'
    },
    infoLabel: {
      fontWeight: '600',
      width: '80px',
      color: '#666'
    },
    infoValue: {
      flex: 1,
      color: '#333',
      wordBreak: 'break-all'
    },
    messageBody: {
      padding: '15px',
      backgroundColor: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      marginBottom: '20px',
      fontSize: '14px'
    },
    attachments: {
      marginBottom: '20px'
    },
    attachmentsTitle: {
      margin: '0 0 10px',
      color: '#333',
      fontSize: '14px',
      fontWeight: '600'
    },
    attachmentItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      marginBottom: '8px',
      fontSize: '13px',
      justifyContent: 'space-between'
    },
    attachmentLink: {
      color: '#007bff',
      textDecoration: 'none',
      cursor: 'pointer',
      flex: 1
    },
    attachmentSize: {
      color: '#999',
      fontSize: '12px',
      marginLeft: '10px'
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

  if (isReplying && !isForwarding) {
    return (
      <ReplyModal
        originalMessage={message}
        onClose={() => setIsReplying(false)}
        onSuccess={handleReplySuccess}
        onBack={onBack}
      />
    );
  }

  if (isForwarding) {
    return (
      <ReplyModal
        originalMessage={message}
        isForward={true}
        onClose={() => setIsForwarding(false)}
        onSuccess={handleForwardSuccess}
        onBack={onBack}
      />
    );
  }

  if (isReporting) {
    return (
      <ReportModal
        message={message}
        onClose={() => setIsReporting(false)}
        onSuccess={() => {
          setSuccess('Message reported');
          setTimeout(() => onBack(), 1000);
        }}
        onBack={onBack}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
        <div style={styles.actions}>
          <button
            style={{ ...styles.btn, ...styles.primaryBtn }}
            onClick={() => setIsReplying(true)}
          >
            💬 Reply
          </button>
          <button
            style={{ ...styles.btn, ...styles.primaryBtn }}
            onClick={() => setIsForwarding(true)}
          >
            ↩️ Forward
          </button>
          <button
            style={{ ...styles.btn, ...styles.warningBtn }}
            onClick={() => setIsReporting(true)}
          >
            ⚠️ Report
          </button>
          <button
            style={{ ...styles.btn, ...styles.warningBtn }}
            onClick={blockSender}
          >
            🚫 Block
          </button>
          <button
            style={{ ...styles.btn, ...styles.dangerBtn }}
            onClick={deleteMessage}
            disabled={deleting}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {error && <div style={styles.errorMsg}>⚠️ {error}</div>}
        {success && <div style={styles.successMsg}>✓ {success}</div>}

        <div style={styles.messageInfo}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>From:</span>
            <span style={styles.infoValue}>{message.sender.name} &lt;{message.sender.email}&gt;</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>To:</span>
            <span style={styles.infoValue}>{message.recipient.name} &lt;{message.recipient.email}&gt;</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Subject:</span>
            <span style={styles.infoValue}>{message.subject}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Date:</span>
            <span style={styles.infoValue}>{formatDate(message.created_at)}</span>
          </div>
        </div>

        <div style={styles.messageBody}>
          {message.body}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div style={styles.attachments}>
            <h4 style={styles.attachmentsTitle}>📎 Attachments ({message.attachments.length})</h4>
            {message.attachments.map((att) => (
              <div key={att.id} style={styles.attachmentItem}>
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.attachmentLink}
                >
                  📄 {att.file_name}
                </a>
                <span style={styles.attachmentSize}>{formatFileSize(att.file_size)}</span>
              </div>
            ))}
          </div>
        )}

        {message.is_reply && message.parent_message_id && (
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e0e0e0' }}>
            <p style={{ margin: '0 0 10px', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>
              This is a reply to a message
            </p>
            {/* Could load and display parent message here */}
          </div>
        )}
      </div>
    </div>
  );
}
