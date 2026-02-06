import { useState, useEffect } from 'react';
import api from '../api';

export default function AssignTask() {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    title: '',
    description: '',
    due_date: ''
  });

  useEffect(() => {
    fetchEmployees();
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
      await api.post('/api/tasks/', {
        employee_id: parseInt(formData.employee_id),
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

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '600px',
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
    form: {
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

      <form style={styles.form} onSubmit={handleSubmit}>
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
                {emp.user.email} ({emp.first_name} {emp.last_name})
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
  );
}
