import { useState, useEffect } from 'react';
import api from '../api';

export default function AddEmployee() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    salary: '',
    hired_at: new Date().toISOString().split('T')[0],
    attendance_pin: ''
  });
  
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [createdEmployee, setCreatedEmployee] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/departments/');
      setDepartments(response.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setError('Failed to load departments');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim() || !formData.department) {
      setError('First name, last name, email, and department are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await api.post('/api/employees/create/', formData);
      
      if (response.data.success) {
        setCreatedEmployee(response.data);
        setSuccess('Employee created successfully!');
        
        // Reset form
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          department: '',
          salary: '',
          hired_at: new Date().toISOString().split('T')[0],
          attendance_pin: ''
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create employee');
      console.error('Create employee error:', err);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px'
    },
    header: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#333'
    },
    form: {
      backgroundColor: '#f9f9f9',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      fontWeight: 500,
      marginBottom: '5px',
      color: '#333',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px'
    },
    btn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 500,
      fontSize: '14px',
      transition: 'all 0.2s'
    },
    primaryBtn: {
      backgroundColor: '#007bff',
      color: 'white',
      flex: 1
    },
    resetBtn: {
      backgroundColor: '#6c757d',
      color: 'white',
      flex: 1
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
    },
    credentialsBox: {
      backgroundColor: '#e8f4f8',
      padding: '15px',
      borderRadius: '4px',
      border: '1px solid #b3d9ff',
      marginTop: '20px'
    },
    credentialRow: {
      marginBottom: '10px',
      fontSize: '14px'
    },
    credentialLabel: {
      fontWeight: 600,
      color: '#333'
    },
    credentialValue: {
      fontFamily: 'monospace',
      backgroundColor: '#fff',
      padding: '8px',
      borderRadius: '3px',
      marginTop: '5px',
      wordBreak: 'break-all'
    },
    copyBtn: {
      marginLeft: '10px',
      padding: '4px 8px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '12px'
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>➕ Add New Employee</h1>

      {error && <div style={styles.errorMsg}>⚠️ {error}</div>}
      {success && <div style={styles.successMsg}>✓ {success}</div>}

      {!createdEmployee ? (
        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>First Name:</label>
            <input
              type="text"
              name="first_name"
              style={styles.input}
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Last Name:</label>
            <input
              type="text"
              name="last_name"
              style={styles.input}
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Doe"
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email:</label>
            <input
              type="email"
              name="email"
              style={styles.input}
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Department:</label>
            <select
              name="department"
              style={styles.select}
              value={formData.department}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">-- Select Department --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Salary:</label>
            <input
              type="number"
              name="salary"
              style={styles.input}
              value={formData.salary}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Hired At:</label>
            <input
              type="date"
              name="hired_at"
              style={styles.input}
              value={formData.hired_at}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Attendance PIN (optional):</label>
            <input
              type="text"
              name="attendance_pin"
              style={styles.input}
              value={formData.attendance_pin}
              onChange={handleChange}
              placeholder="4-digit PIN"
              disabled={loading}
            />
          </div>

          <div style={styles.buttonGroup}>
            <button
              type="reset"
              style={{ ...styles.btn, ...styles.resetBtn }}
              onClick={() => setFormData({
                first_name: '',
                last_name: '',
                email: '',
                department: '',
                salary: '',
                hired_at: new Date().toISOString().split('T')[0],
                attendance_pin: ''
              })}
              disabled={loading}
            >
              Clear
            </button>
            <button
              type="submit"
              style={{ ...styles.btn, ...styles.primaryBtn }}
              disabled={loading}
            >
              {loading ? '⏳ Creating...' : '✨ Create Employee'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div style={styles.credentialsBox}>
            <h3 style={{ marginTop: 0, color: '#007bff' }}>🎉 Employee Created Successfully!</h3>
            
            <div style={styles.credentialRow}>
              <span style={styles.credentialLabel}>Name:</span>
              <div style={styles.credentialValue}>
                {createdEmployee.employee.first_name} {createdEmployee.employee.last_name}
              </div>
            </div>

            <div style={styles.credentialRow}>
              <span style={styles.credentialLabel}>Email:</span>
              <div style={styles.credentialValue}>
                {createdEmployee.credentials.email}
              </div>
            </div>

            <div style={styles.credentialRow}>
              <span style={styles.credentialLabel}>Temporary Password:</span>
              <div style={styles.credentialValue}>
                {createdEmployee.credentials.temporary_password}
                <button 
                  style={styles.copyBtn}
                  onClick={() => copyToClipboard(createdEmployee.credentials.temporary_password)}
                >
                  📋 Copy
                </button>
              </div>
            </div>

            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #b3d9ff', fontSize: '13px', color: '#333' }}>
              <strong>⚠️ Important:</strong> Share these credentials with the new employee. They can log in with the email and temporary password, and should change their password after first login.
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button
              style={{ ...styles.btn, ...styles.primaryBtn }}
              onClick={() => setCreatedEmployee(null)}
            >
              ➕ Add Another Employee
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
