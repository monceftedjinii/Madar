import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [marking, setMarking] = useState(null) // Track which item is being marked
  const navigate = useNavigate()

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/notifications/')
      setNotifications(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      setMarking(notificationId)
      await api.post(`/api/notifications/${notificationId}/read/`, {})
      
      // Update UI: mark notification as read locally
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      )
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to mark as read')
    } finally {
      setMarking(null)
    }
  }

  const handleOpenNotification = async (notif) => {
    try {
      if (!notif.is_read) {
        await handleMarkAsRead(notif.id)
      }
    } catch {
      // ignore mark errors for navigation
    }
    if (notif.link) {
      navigate(notif.link)
      return
    }
    const msg = `${notif.title} ${notif.message}`.toLowerCase()
    if (msg.includes('leave')) {
      navigate('/leaves')
      return
    }
    if (msg.includes('document') || msg.includes('comment')) {
      navigate('/documents')
    }
  }

  if (loading) {
    return <div style={styles.container}>
      <h1>Notifications</h1>
      <div style={styles.loading}>Loading notifications...</div>
    </div>
  }

  if (error) {
    return <div style={styles.container}>
      <h1>Notifications</h1>
      <div style={styles.error}>{error}</div>
      <button onClick={fetchNotifications} style={styles.retryBtn}>
        Retry
      </button>
    </div>
  }

  if (notifications.length === 0) {
    return <div style={styles.container}>
      <h1>Notifications</h1>
      <div style={styles.emptyState}>
        <p>No notifications yet</p>
      </div>
    </div>
  }

  return (
    <div style={styles.container}>
      <h1>Notifications</h1>
      
      <div style={styles.summary}>
        Total: {notifications.length} | 
        Unread: {notifications.filter(n => !n.is_read).length}
      </div>

      <div style={styles.listContainer}>
        {notifications.map((notif) => (
          <div
            key={notif.id}
            style={{
              ...styles.notificationItem,
              ...(notif.is_read ? styles.notificationRead : styles.notificationUnread),
            }}
          >
            <div style={styles.notificationHeader}>
              <button
                onClick={() => handleOpenNotification(notif)}
                style={styles.titleButton}
                type="button"
              >
                {notif.title}
              </button>
              {!notif.is_read && <span style={styles.badge}>UNREAD</span>}
            </div>

            <p style={styles.message}>{notif.message}</p>

            <div style={styles.footer}>
              <span style={styles.timestamp}>
                {new Date(notif.created_at).toLocaleString()}
              </span>
              
              {!notif.is_read && (
                <button
                  onClick={() => handleMarkAsRead(notif.id)}
                  disabled={marking === notif.id}
                  style={{
                    ...styles.markReadBtn,
                    ...(marking === notif.id ? styles.markReadBtnLoading : {}),
                  }}
                >
                  {marking === notif.id ? 'Marking...' : 'Mark as Read'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
  },
  summary: {
    backgroundColor: '#f0f0f0',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#333',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  notificationItem: {
    padding: '15px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    transition: 'all 0.2s ease',
  },
  notificationUnread: {
    backgroundColor: '#fffbf0',
    borderLeft: '4px solid #ff9800',
    boxShadow: '0 2px 4px rgba(255, 152, 0, 0.2)',
  },
  notificationRead: {
    backgroundColor: '#f9f9f9',
    opacity: 0.8,
  },
  notificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    color: '#333',
  },
  titleButton: {
    margin: 0,
    padding: 0,
    fontSize: '16px',
    color: '#0d6efd',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left'
  },
  badge: {
    backgroundColor: '#ff9800',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  message: {
    margin: '10px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#999',
  },
  markReadBtn: {
    padding: '6px 12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.2s',
  },
  markReadBtnLoading: {
    backgroundColor: '#999',
    cursor: 'not-allowed',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
  },
  error: {
    padding: '15px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  retryBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#999',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
}

export default Notifications
