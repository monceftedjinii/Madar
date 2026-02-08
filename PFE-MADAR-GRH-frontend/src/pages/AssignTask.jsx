import { useState, useEffect } from 'react';
import api from '../api';

export default function AssignTask() {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [taskHistory, setTaskHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'pending', 'done'

  const [formData, setFormData] = useState({
    employee_id: '',
    title: '',
    description: '',
    due_date: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchTaskHistory();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      setError(null);
      const response = await api.get('/api/employees/');
      setEmployees(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchTaskHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get('/api/tasks/chef/');
      setTaskHistory(response.data || []);
    } catch (err) {
      console.error('Failed to load task history:', err);
      setTaskHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear success message on new input
    if (success) setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (!formData.employee_id || !formData.title || !formData.due_date) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Submitting task:', {
        assigned_to: parseInt(formData.employee_id),
        title: formData.title,
        description: formData.description,
        due_date: formData.due_date
      });
      
      await api.post('/api/tasks/', {
        assigned_to: parseInt(formData.employee_id),
        title: formData.title,
        description: formData.description,
        due_date: formData.due_date
      });

      setSuccess('Task assigned successfully');
      setFormData({
        employee_id: '',
        title: '',
        description: '',
        due_date: ''
      });

      await fetchTaskHistory();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Task assignment error:', err);
      const errorMsg = err.response?.data?.detail || 
                       (typeof err.response?.data === 'object' ? JSON.stringify(err.response?.data) : err.response?.data) || 
                       err.message || 
                       'Failed to assign task';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredHistory = () => {
    if (historyFilter === 'pending') {
      return taskHistory.filter(t => t.status === 'TODO');
    } else if (historyFilter === 'done') {
      return taskHistory.filter(t => t.status === 'DONE');
    }
    return taskHistory;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const styles = {
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    mainContent: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '30px',
      marginTop: '20px'
    },
    header: {
      marginBottom: '20px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0'
    },
    alertBanner: {
      padding: '12px 16px',
      borderRadius: '4px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    errorBanner: {
      backgroundColor: '#ffe6e6',
      color: '#c33',
      border: '1px solid #f5a9a9'
    },
    successBanner: {
      backgroundColor: '#e6f7e6',
      color: '#065706',
      border: '1px solid #a9d8a9'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '18px',
      color: 'inherit',
      padding: '0'
    },
    formPanel: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    panelTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '20px',
      marginTop: '0'
    },
    historyPanel: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '8px'
    },
    required: {
      color: '#c33'
    },
    input: {
      width: '100%',
      padding: '10px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontFamily: 'inherit'
    },
    inputError: {
      borderColor: '#c33'
    },
    textarea: {
      width: '100%',
      padding: '10px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      minHeight: '100px',
      resize: 'vertical'
    },
    select: {
      width: '100%',
      padding: '10px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontFamily: 'inherit'
    },
    selectDisabled: {
      backgroundColor: '#f5f5f5',
      cursor: 'not-allowed'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-start'
    },
    submitButton: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    submitButtonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    resetButton: {
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    loadingMessage: {
      color: '#666',
      textAlign: 'center',
      padding: '40px 20px'
    },
    filterButtons: {
      display: 'flex',
      gap: '10px',
      marginBottom: '15px'
    },
    filterButton: {
      padding: '8px 12px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      backgroundColor: '#f5f5f5',
      cursor: 'pointer',
      color: '#333',
      fontWeight: '500'
    },
    filterButtonActive: {
      backgroundColor: '#007bff',
      color: 'white',
      border: '1px solid #007bff'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    tableHeader: {
      backgroundColor: '#f9f9f9',
      borderBottom: '2px solid #ddd'
    },
    tableHeaderCell: {
      padding: '10px',
      fontWeight: 'bold',
      color: '#333',
      textAlign: 'left'
    },
    tableRow: {
      borderBottom: '1px solid #eee'
    },
    tableCell: {
      padding: '10px'
    },
    tableCellCenter: {
      textAlign: 'center'
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '3px',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'inline-block'
    },
    statusTodo: {
      backgroundColor: '#fff3cd',
      color: '#856404'
    },
    statusDone: {
      backgroundColor: '#d4edda',
      color: '#155724'
    },
    emptyState: {
      color: '#999',
      textAlign: 'center',
      padding: '40px 20px',
      fontSize: '14px'
    }
  };

  if (loadingEmployees) {
    return <div style={styles.container}><div style={styles.loadingMessage}>Loading employees...</div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Assign Task</h1>
      </div>

      {error && (
        <div style={{...styles.alertBanner, ...styles.errorBanner}}>
          <span>{error}</span>
          <button style={styles.closeButton} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div style={{...styles.alertBanner, ...styles.successBanner}}>
          <span>{success}</span>
          <button style={styles.closeButton} onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      <div style={styles.mainContent}>
        <div style={styles.formPanel}>
          <h2 style={styles.panelTitle}>New Task</h2>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Employee <span style={styles.required}>*</span>
              </label>
              <select
                style={{...styles.select, ...(loadingEmployees ? styles.selectDisabled : {})}}
                name="employee_id"
                value={formData.employee_id}
                onChange={handleInputChange}
                disabled={loadingEmployees}
              >
                <option value="">Select an employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Task Title <span style={styles.required}>*</span>
              </label>
              <input
                style={styles.input}
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter task title"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Description <span style={{color: '#999'}}>(optional)</span>
              </label>
              <textarea
                style={styles.textarea}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter task description"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Due Date <span style={styles.required}>*</span>
              </label>
              <input
                style={styles.input}
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
              />
            </div>

            <div style={styles.buttonGroup}>
              <button
                style={{...styles.submitButton, ...(submitting ? styles.submitButtonDisabled : {})}}
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Assigning...' : 'Assign Task'}
              </button>
              <button
                style={styles.resetButton}
                type="reset"
                onClick={() => {
                  setFormData({
                    employee_id: '',
                    title: '',
                    description: '',
                    due_date: ''
                  });
                  setError(null);
                  setSuccess(null);
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        <div style={styles.historyPanel}>
          <h2 style={styles.panelTitle}>Task History</h2>
          <div style={styles.filterButtons}>
            {['all', 'pending', 'done'].map(filter => (
              <button
                key={filter}
                style={{
                  ...styles.filterButton,
                  ...(historyFilter === filter ? styles.filterButtonActive : {})
                }}
                onClick={() => setHistoryFilter(filter)}
              >
                {filter === 'all' ? 'All' : filter === 'pending' ? 'Pending' : 'Done'}
              </button>
            ))}
          </div>

          {loadingHistory ? (
            <div style={styles.loadingMessage}>Loading...</div>
          ) : getFilteredHistory().length === 0 ? (
            <div style={styles.emptyState}>
              {historyFilter === 'all' ? 'No tasks assigned yet' : `No ${historyFilter} tasks`}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableHeaderCell}>Employee</th>
                  <th style={styles.tableHeaderCell}>Title</th>
                  <th style={{...styles.tableHeaderCell, ...styles.tableCellCenter}}>Status</th>
                  <th style={{...styles.tableHeaderCell, ...styles.tableCellCenter}}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredHistory().map(task => (
                  <tr key={task.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <strong>{task.employee.first_name} {task.employee.last_name}</strong>
                      <div style={{fontSize: '12px', color: '#999'}}>{task.employee.email}</div>
                    </td>
                    <td style={styles.tableCell}>
                      <strong>{task.title}</strong>
                      {task.description && (
                        <div style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>
                          {task.description.substring(0, 50)}{task.description.length > 50 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td style={{...styles.tableCell, ...styles.tableCellCenter}}>
                      <span style={{
                        ...styles.statusBadge,
                        ...(task.status === 'TODO' ? styles.statusTodo : styles.statusDone)
                      }}>
                        {task.status === 'TODO' ? 'Pending' : 'Done'}
                      </span>
                    </td>
                    <td style={{...styles.tableCell, ...styles.tableCellCenter}}>
                      <span style={{fontSize: '12px', color: '#666'}}>
                        {formatDateTime(task.completed_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
