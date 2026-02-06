import { useState, useEffect } from 'react';
import api from '../api';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(null); // which task is being marked

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/tasks/me/');
      setTasks(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const markAsDone = async (taskId) => {
    try {
      setMarking(taskId);
      await api.patch(`/api/tasks/${taskId}/done/`);
      // Update local state optimistically
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: 'DONE' } : task
      ));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark task as done');
    } finally {
      setMarking(null);
    }
  };

  const styles = {
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      marginBottom: '30px'
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
    errorBanner: {
      backgroundColor: '#ffe6e6',
      color: '#c33',
      padding: '12px 16px',
      borderRadius: '4px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    retryButton: {
      backgroundColor: '#c33',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px'
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
      fontSize: '16px'
    },
    tasksList: {
      display: 'grid',
      gap: '12px'
    },
    taskCard: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start'
    },
    taskCardDone: {
      backgroundColor: '#f5f5f5',
      opacity: 0.7
    },
    taskContent: {
      flex: 1
    },
    taskTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 8px 0'
    },
    taskTitleDone: {
      textDecoration: 'line-through',
      color: '#999'
    },
    taskDescription: {
      fontSize: '14px',
      color: '#666',
      margin: '0 0 8px 0',
      lineHeight: '1.5'
    },
    taskMeta: {
      display: 'flex',
      gap: '20px',
      fontSize: '12px',
      color: '#999'
    },
    statusBadge: {
      display: 'inline-block',
      backgroundColor: '#fff3cd',
      color: '#856404',
      padding: '4px 8px',
      borderRadius: '3px',
      fontSize: '11px',
      fontWeight: 'bold',
      marginRight: '8px'
    },
    statusBadgeDone: {
      backgroundColor: '#d4edda',
      color: '#155724'
    },
    taskActions: {
      marginLeft: '16px',
      display: 'flex',
      gap: '8px'
    },
    markDoneButton: {
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      padding: '8px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 'bold',
      whiteSpace: 'nowrap'
    },
    markDoneButtonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    }
  };

  if (loading) {
    return <div style={styles.container}><div style={styles.loadingMessage}>Loading tasks...</div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Tasks</h1>
        <p style={styles.subtitle}>Total: {tasks.length} | Done: {tasks.filter(t => t.status === 'DONE').length}</p>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button style={styles.retryButton} onClick={fetchTasks}>Retry</button>
        </div>
      )}

      {tasks.length === 0 && !error ? (
        <div style={styles.emptyMessage}>No tasks assigned yet</div>
      ) : (
        <div style={styles.tasksList}>
          {tasks.map(task => (
            <div
              key={task.id}
              style={{
                ...styles.taskCard,
                ...(task.status === 'DONE' ? styles.taskCardDone : {})
              }}
            >
              <div style={styles.taskContent}>
                <h3 style={{...styles.taskTitle, ...(task.status === 'DONE' ? styles.taskTitleDone : {})}}>
                  {task.title}
                </h3>
                {task.description && (
                  <p style={styles.taskDescription}>{task.description}</p>
                )}
                <div style={styles.taskMeta}>
                  <span style={{...styles.statusBadge, ...(task.status === 'DONE' ? styles.statusBadgeDone : {})}}>
                    {task.status}
                  </span>
                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                  <span>Assigned: {new Date(task.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {task.status === 'TODO' && (
                <div style={styles.taskActions}>
                  <button
                    style={{...styles.markDoneButton, ...(marking === task.id ? styles.markDoneButtonDisabled : {})}}
                    onClick={() => markAsDone(task.id)}
                    disabled={marking === task.id}
                  >
                    {marking === task.id ? 'Marking...' : 'Mark as Done'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
