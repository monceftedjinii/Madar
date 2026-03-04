import { useState, useEffect } from 'react';
import api from '../../api';
import InboxView from './InboxView';
import SentView from './SentView';
import DraftsView from './DraftsView';
import ComposeModal from './ComposeModal';
import MessageDetail from './MessageDetail';
import BlockedUsersList from './BlockedUsersList';
import './Messages.css';

export default function Messages() {
  const [tab, setTab] = useState('inbox');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/messages/inbox/?page=1');
      const unread = response.data.messages.filter(m => !m.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const handleMessageSent = () => {
    setShowCompose(false);
    setTab('sent');
    setRefreshTrigger(r => r + 1);
    fetchUnreadCount();
  };

  const handleMessageComposed = () => {
    setShowCompose(false);
    setRefreshTrigger(r => r + 1);
    fetchUnreadCount();
  };

  const handleMessageDeleted = () => {
    setSelectedMessage(null);
    setRefreshTrigger(r => r + 1);
  };

  const handleSelectMessage = (message) => {
    setSelectedMessage(message);
  };

  const handleBackFromDetail = () => {
    setSelectedMessage(null);
    setRefreshTrigger(r => r + 1);
    fetchUnreadCount();
  };

  // Show message detail if selected
  if (selectedMessage) {
    return (
      <MessageDetail 
        message={selectedMessage} 
        onBack={handleBackFromDetail}
        onDelete={handleMessageDeleted}
        onRefresh={() => setRefreshTrigger(r => r + 1)}
      />
    );
  }

  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    sidebar: {
      width: '200px',
      backgroundColor: '#fff',
      borderRight: '1px solid #e0e0e0',
      padding: '20px 0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    sidebarTitle: {
      fontSize: '14px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#666',
      padding: '0 15px 15px',
      letterSpacing: '0.5px'
    },
    navItem: {
      padding: '12px 15px',
      margin: '0 5px',
      cursor: 'pointer',
      borderRadius: '4px',
      fontSize: '14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'background 0.2s'
    },
    navItemActive: {
      backgroundColor: '#007bff',
      color: 'white',
      fontWeight: 'bold'
    },
    navItemHover: {
      backgroundColor: '#f0f0f0'
    },
    badge: {
      backgroundColor: '#dc3545',
      color: 'white',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      padding: '2px 6px',
      minWidth: '20px',
      textAlign: 'center'
    },
    composeBtn: {
      padding: '10px 15px',
      margin: '20px 5px',
      width: 'calc(100% - 10px)',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '13px',
      transition: 'background 0.2s'
    },
    composeBtnHover: {
      backgroundColor: '#218838'
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    tabContainer: {
      display: 'flex',
      borderBottom: '2px solid #e0e0e0',
      backgroundColor: '#fff'
    },
    tabButton: {
      padding: '15px 20px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: '#666',
      borderBottom: '3px solid transparent',
      transition: 'all 0.2s'
    },
    tabButtonActive: {
      color: '#007bff',
      borderBottomColor: '#007bff'
    },
    contentArea: {
      flex: 1,
      overflow: 'auto'
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTitle}>📧 Messages</div>
        
        <div
          style={{
            ...styles.navItem,
            ...(tab === 'inbox' ? styles.navItemActive : {}),
          }}
          onClick={() => setTab('inbox')}
        >
          <span>📥 Inbox</span>
          {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
        </div>

        <div
          style={{
            ...styles.navItem,
            ...(tab === 'sent' ? styles.navItemActive : {}),
          }}
          onClick={() => setTab('sent')}
        >
          <span>📤 Sent</span>
        </div>

        <div
          style={{
            ...styles.navItem,
            ...(tab === 'drafts' ? styles.navItemActive : {}),
          }}
          onClick={() => setTab('drafts')}
        >
          <span>📝 Drafts</span>
        </div>

        <div style={{ borderTop: '1px solid #e0e0e0', margin: '15px 0' }}></div>

        <div
          style={{
            ...styles.navItem,
            ...(tab === 'blocked' ? styles.navItemActive : {}),
          }}
          onClick={() => setTab('blocked')}
        >
          <span>🚫 Blocked</span>
        </div>

        <button
          style={styles.composeBtn}
          onClick={() => setShowCompose(true)}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
        >
          ✉️ Compose
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Tabs */}
        {tab !== 'blocked' && (
          <div style={styles.tabContainer}>
            <button
              style={{
                ...styles.tabButton,
                ...(tab === 'inbox' ? styles.tabButtonActive : {}),
              }}
              onClick={() => setTab('inbox')}
            >
              Inbox
            </button>
            <button
              style={{
                ...styles.tabButton,
                ...(tab === 'sent' ? styles.tabButtonActive : {}),
              }}
              onClick={() => setTab('sent')}
            >
              Sent
            </button>
            <button
              style={{
                ...styles.tabButton,
                ...(tab === 'drafts' ? styles.tabButtonActive : {}),
              }}
              onClick={() => setTab('drafts')}
            >
              Drafts
            </button>
          </div>
        )}

        {/* Content */}
        <div style={styles.contentArea}>
          {tab === 'inbox' && (
            <InboxView 
              onSelectMessage={handleSelectMessage}
              refreshTrigger={refreshTrigger}
              onUnreadCountChange={setUnreadCount}
            />
          )}
          {tab === 'sent' && (
            <SentView 
              onSelectMessage={handleSelectMessage}
              refreshTrigger={refreshTrigger}
            />
          )}
          {tab === 'drafts' && (
            <DraftsView 
              onCompose={(recipient) => {
                setShowCompose(true);
              }}
              refreshTrigger={refreshTrigger}
            />
          )}
          {tab === 'blocked' && (
            <BlockedUsersList refreshTrigger={refreshTrigger} />
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSent={handleMessageSent}
          onComposed={handleMessageComposed}
        />
      )}
    </div>
  );
}
