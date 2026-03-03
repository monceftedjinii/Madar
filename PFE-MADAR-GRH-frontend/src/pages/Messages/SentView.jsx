import { useState, useEffect } from 'react';
import api from '../../api';

export default function SentView({ onSelectMessage, refreshTrigger }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchSent();
  }, [page, refreshTrigger]);

  const fetchSent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/messages/sent/?page=${page}`);
      setMessages(response.data.messages || []);
      setTotalPages(Math.ceil(response.data.total / response.data.page_size));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load sent messages');
      console.error('Failed to load sent messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
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
    messagesList: {
      flex: 1,
      overflow: 'auto'
    },
    messageItem: {
      display: 'flex',
      padding: '12px 15px',
      borderBottom: '1px solid #e0e0e0',
      cursor: 'pointer',
      transition: 'background 0.2s',
      backgroundColor: '#fff',
      alignItems: 'center'
    },
    recipient: {
      fontWeight: 600,
      color: '#333',
      flex: '0 0 150px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      marginLeft: '15px'
    },
    subject: {
      fontWeight: 500,
      color: '#333',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      fontSize: '14px'
    },
    preview: {
      fontSize: '13px',
      color: '#666',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      marginTop: '4px'
    },
    time: {
      fontSize: '12px',
      color: '#999',
      flex: '0 0 80px',
      textAlign: 'right',
      whiteSpace: 'nowrap',
      marginLeft: '10px'
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      color: '#999'
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '8px',
      padding: '20px',
      borderTop: '1px solid #e0e0e0',
      backgroundColor: '#fff'
    },
    paginationBtn: {
      padding: '6px 10px',
      border: '1px solid #ddd',
      background: 'white',
      cursor: 'pointer',
      borderRadius: '3px',
      fontSize: '13px'
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📬</div>
          <div>Loading sent messages...</div>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📤</div>
          <div style={{ fontSize: '16px' }}>No sent messages</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.messagesList}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={styles.messageItem}
            onClick={() => onSelectMessage(msg)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
          >
            <div style={styles.recipient}>
              To: {msg.recipient.name || msg.recipient.email}
            </div>
            
            <div style={styles.content}>
              <div style={styles.subject}>
                {msg.subject}
              </div>
              <div style={styles.preview}>
                {msg.body ? truncateText(msg.body) : '(No content)'}
              </div>
            </div>
            
            {msg.has_attachments && <span style={{ marginRight: '8px', fontSize: '12px' }}>📎</span>}
            
            <div style={styles.time}>
              {formatDate(msg.created_at)}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={styles.paginationBtn}
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            ← Previous
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return pageNum;
          }).map((pageNum) => (
            <button
              key={pageNum}
              style={{
                ...styles.paginationBtn,
                ...(page === pageNum ? { background: '#007bff', color: 'white', borderColor: '#007bff' } : {})
              }}
              onClick={() => setPage(pageNum)}
            >
              {pageNum}
            </button>
          ))}
          
          <button
            style={styles.paginationBtn}
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
