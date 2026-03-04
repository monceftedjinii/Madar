import { useState, useEffect } from 'react';
import api from '../../api';

export default function BlockedUsersList({ refreshTrigger }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, [refreshTrigger]);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/users/blocked/');
      setBlockedUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load blocked users');
      console.error('Failed to fetch blocked users:', err);
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (userId) => {
    if (!window.confirm('Unblock this user?')) return;

    try {
      await api.post(`/api/users/${userId}/unblock/`);
      setBlockedUsers(blockedUsers.filter(u => u.id !== userId));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to unblock user');
    }
  };

  const styles = {
    container: {
      padding: '20px',
      height: '100%',
      overflow: 'auto'
    },
    title: {
      margin: '0 0 20px',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#333'
    },
    content: {
      maxWidth: '600px'
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
    emptyState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#999',
      fontSize: '14px'
    },
    userCard: {
      padding: '15px',
      backgroundColor: '#f9f9f9',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    userInfo: {
      flex: 1
    },
    userName: {
      fontWeight: '600',
      color: '#333',
      marginBottom: '4px'
    },
    userEmail: {
      fontSize: '13px',
      color: '#666'
    },
    unblockBtn: {
      padding: '6px 12px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      transition: 'background 0.2s'
    },
    loadingMsg: {
      textAlign: 'center',
      padding: '20px',
      color: '#666',
      fontSize: '14px'
    }
  };

  if (loading) {
    return <div style={styles.loadingMsg}>Loading blocked users...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h2 style={styles.title}>🚫 Blocked Users</h2>

        {error && <div style={styles.errorMsg}>⚠️ {error}</div>}

        {blockedUsers.length === 0 ? (
          <div style={styles.emptyState}>
            <p>You haven't blocked any users.</p>
            <p style={{ fontSize: '12px', margin: '10px 0 0' }}>
              Blocked users won't be able to send you messages.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '15px' }}>
              You have blocked {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'}. They cannot send you messages or contact you.
            </p>
            {blockedUsers.map((user) => (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.userInfo}>
                  <div style={styles.userName}>👤 {user.name}</div>
                  <div style={styles.userEmail}>{user.email}</div>
                </div>
                <button
                  style={styles.unblockBtn}
                  onClick={() => unblockUser(user.id)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
                >
                  🔓 Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
