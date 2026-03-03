import { useState, useEffect } from 'react';
import api from '../../api';

export default function DraftsView({ refreshTrigger }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchDrafts();
  }, [refreshTrigger]);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/messages/drafts/');
      setDrafts(response.data.drafts || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load drafts');
      console.error('Failed to load drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (draftId) => {
    if (!window.confirm('Delete this draft?')) return;
    
    try {
      await api.delete(`/api/messages/drafts/${draftId}/delete/`);
      setDrafts(drafts.filter(d => d.id !== draftId));
    } catch (err) {
      alert('Failed to delete draft: ' + (err.response?.data?.detail || err.message));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, length = 100) => {
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const styles = {
    container: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    },
    draftsList: {
      flex: 1,
      overflow: 'auto'
    },
    draftItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 15px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#fff',
      transition: 'background 0.2s'
    },
    draftContent: {
      flex: 1
    },
    draftTo: {
      fontSize: '13px',
      color: '#999',
      marginBottom: '4px'
    },
    draftSubject: {
      fontWeight: 500,
      color: '#333',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      marginBottom: '4px'
    },
    draftPreview: {
      fontSize: '13px',
      color: '#666',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    draftActions: {
      display: 'flex',
      gap: '8px',
      marginLeft: '10px'
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
    editBtn: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    deleteBtn: {
      backgroundColor: '#dc3545',
      color: 'white'
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      color: '#999'
    }
  };

  if (loading && drafts.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📬</div>
          <div>Loading drafts...</div>
        </div>
      </div>
    );
  }

  if (!drafts || drafts.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📝</div>
          <div style={{ fontSize: '16px', marginBottom: '20px' }}>No drafts yet</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.draftsList}>
        {drafts.map((draft) => (
          <div
            key={draft.id}
            style={styles.draftItem}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
          >
            <div style={styles.draftContent}>
              {draft.recipient && (
                <div style={styles.draftTo}>
                  To: {draft.recipient.name || draft.recipient.email}
                </div>
              )}
              <div style={styles.draftSubject}>
                {draft.subject || '(No subject)'}
              </div>
              <div style={styles.draftPreview}>
                {draft.body ? truncateText(draft.body) : '(No content)'}
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                Last updated: {formatDate(draft.updated_at)}
              </div>
            </div>
            
            <div style={styles.draftActions}>
              <button
                style={{ ...styles.btn, ...styles.editBtn }}
                onClick={() => {
                  // TODO: Open compose modal with draft data
                  alert('Edit feature coming soon');
                }}
              >
                Continue
              </button>
              <button
                style={{ ...styles.btn, ...styles.deleteBtn }}
                onClick={() => deleteDraft(draft.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
