import { useState, useEffect } from 'react';
import api from '../api';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(null); // which task is being marked
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    fetchTasks();
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setExportFromDate(firstDay.toISOString().split('T')[0]);
    setExportToDate(today.toISOString().split('T')[0]);
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

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportError(null);
      const response = await api.get('/api/reports/tasks/export/', {
        params: {
          from: exportFromDate,
          to: exportToDate,
          status: exportStatus || undefined,
          file_format: exportFormat
        },
        responseType: 'blob'
      });
      const ext = exportFormat === 'xlsx' ? 'xlsx' : 'pdf';
      const filename = `task_report_${exportFromDate}_${exportToDate}.${ext}`;
      downloadBlob(response.data, filename);
      setExportOpen(false);
    } catch (err) {
      const message = await getExportErrorMessage(err, 'Failed to export tasks');
      setExportError(message);
    } finally {
      setExporting(false);
    }
  };

  const getExportErrorMessage = async (err, fallback) => {
    const data = err?.response?.data;
    if (data instanceof Blob) {
      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        return parsed.detail || parsed.error || fallback;
      } catch {
        return text || fallback;
      }
    }
    return err?.response?.data?.detail || err?.response?.data?.error || fallback;
  };

  const getAssignerName = (assignedBy) => {
    if (!assignedBy) return '-';
    const name = `${assignedBy.first_name || ''} ${assignedBy.last_name || ''}`.trim();
    return name || assignedBy.email || '-';
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
    headerActions: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px'
    },
    exportButton: {
      padding: '8px 14px',
      fontSize: '13px',
      fontWeight: 'bold',
      backgroundColor: '#17a2b8',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    exportButtonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      width: '360px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
    },
    modalTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '12px',
      color: '#333'
    },
    modalField: {
      marginBottom: '12px'
    },
    modalLabel: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '6px'
    },
    modalInput: {
      width: '100%',
      padding: '8px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box'
    },
    modalActions: {
      display: 'flex',
      gap: '10px',
      marginTop: '10px'
    },
    modalButton: {
      flex: 1,
      padding: '8px 12px',
      fontSize: '12px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer'
    },
    modalConfirm: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    modalCancel: {
      backgroundColor: '#6c757d',
      color: 'white'
    },
    modalError: {
      marginTop: '6px',
      color: '#c33',
      fontSize: '12px'
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
        <div style={styles.headerActions}>
          <div>
            <h1 style={styles.title}>My Tasks</h1>
            <p style={styles.subtitle}>Total: {tasks.length} | Done: {tasks.filter(t => t.status === 'DONE').length}</p>
          </div>
          <button
            style={{...styles.exportButton, ...(exporting ? styles.exportButtonDisabled : {})}}
            onClick={() => {
              setExportOpen(true);
              setExportError(null);
            }}
            disabled={exporting}
          >
            Export
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button style={styles.retryButton} onClick={fetchTasks}>Retry</button>
        </div>
      )}

      {exportOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalTitle}>Export Tasks</div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>From Date</label>
              <input
                style={styles.modalInput}
                type="date"
                value={exportFromDate}
                onChange={(e) => setExportFromDate(e.target.value)}
              />
            </div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>To Date</label>
              <input
                style={styles.modalInput}
                type="date"
                value={exportToDate}
                onChange={(e) => setExportToDate(e.target.value)}
              />
            </div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Status</label>
              <select
                style={styles.modalInput}
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="assigned">Assigned</option>
                <option value="overdue">Overdue</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Format</label>
              <select
                style={styles.modalInput}
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="pdf">PDF</option>
                <option value="xlsx">Excel</option>
              </select>
            </div>
            {exportError && <div style={styles.modalError}>{exportError}</div>}
            <div style={styles.modalActions}>
              <button
                style={{
                  ...styles.modalButton,
                  ...styles.modalConfirm,
                  ...(exporting ? styles.exportButtonDisabled : {})
                }}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : 'Download'}
              </button>
              <button
                style={{
                  ...styles.modalButton,
                  ...styles.modalCancel
                }}
                onClick={() => setExportOpen(false)}
                disabled={exporting}
              >
                Cancel
              </button>
            </div>
          </div>
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
                  <span>Assigned By: {getAssignerName(task.assigned_by)}</span>
                  <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</span>
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
