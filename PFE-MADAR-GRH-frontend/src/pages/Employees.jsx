import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canAddEmployee = user?.role === 'GRH';
  const canManageEmployees = user?.role === 'GRH';

  const handleDeleteEmployee = async (employee) => {
    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email;
    const confirmed = window.confirm(`Delete employee ${fullName}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setError(null);
      setSuccess(null);
      await api.delete(`/api/employees/${employee.id}/delete/`);
      setSuccess(`Employee ${fullName} deleted successfully.`);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete employee');
    }
  };

  const handleResetPassword = async (employee) => {
    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email;
    const confirmed = window.confirm(`Generate a new password for ${fullName}?`);
    if (!confirmed) return;

    try {
      setError(null);
      setSuccess(null);
      const response = await api.post(`/api/employees/${employee.id}/reset-password/`);
      const creds = response.data?.credentials;
      const message = creds
        ? `New password for ${creds.email}: ${creds.temporary_password}`
        : `Password reset successfully for ${fullName}`;
      setSuccess(message);
      if (creds?.temporary_password) {
        window.alert(message);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    }
  };

  const handleEditEmployee = async (employee) => {
    const first_name = window.prompt('First name', employee.first_name || '');
    if (first_name === null) return;

    const last_name = window.prompt('Last name', employee.last_name || '');
    if (last_name === null) return;

    const email = window.prompt('Email', employee.email || '');
    if (email === null) return;

    const position = window.prompt('Poste / Position', employee.position || '');
    if (position === null) return;

    const salary = window.prompt('Salary', String(employee.salary || '0.00'));
    if (salary === null) return;

    const hired_at = window.prompt('Hire date (YYYY-MM-DD)', employee.hired_at || new Date().toISOString().split('T')[0]);
    if (hired_at === null) return;

    const attendance_pin = window.prompt('Attendance PIN (optional)', employee.attendance_pin || '');
    if (attendance_pin === null) return;

    const departmentInput = window.prompt('Department ID', String(employee.department?.id || ''));
    if (departmentInput === null) return;

    try {
      setError(null);
      setSuccess(null);
      await api.put(`/api/employees/${employee.id}/update/`, {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        position: position.trim(),
        salary,
        hired_at,
        attendance_pin,
        department: Number(departmentInput),
      });
      setSuccess('Employee updated successfully.');
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update employee');
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/employees/');
      setEmployees(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filter by name, email or position
  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const email = `${emp.email || ''}`.toLowerCase();
    const position = `${emp.position || ''}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || email.includes(term) || position.includes(term);
  });

  const styles = {
    container: {
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '30px'
    },
    headerText: {
      display: 'flex',
      flexDirection: 'column'
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
    addButton: {
      display: 'inline-block',
      padding: '10px 14px',
      fontSize: '13px',
      fontWeight: '600',
      color: '#fff',
      backgroundColor: '#2563eb',
      borderRadius: '6px',
      textDecoration: 'none'
    },
    filterSection: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '15px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    filterLabel: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '6px',
      display: 'block'
    },
    filterInput: {
      padding: '8px 12px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      width: '100%',
      maxWidth: '300px',
      boxSizing: 'border-box'
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
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '18px',
      color: 'inherit',
      padding: '0'
    },
    successBanner: {
      backgroundColor: '#e7f8ee',
      color: '#1f7a3e',
      border: '1px solid #9bd3b0'
    },
    tableSection: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    },
    loadingMessage: {
      padding: '40px 20px',
      textAlign: 'center',
      color: '#666'
    },
    emptyMessage: {
      padding: '40px 20px',
      textAlign: 'center',
      color: '#666'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableHeader: {
      backgroundColor: '#f5f5f5',
      borderBottom: '2px solid #ddd'
    },
    tableHeaderCell: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#333'
    },
    tableRow: {
      borderBottom: '1px solid #eee',
      transition: 'background-color 0.2s'
    },
    tableRowHover: {
      backgroundColor: '#f9f9f9'
    },
    tableCell: {
      padding: '12px 16px',
      fontSize: '13px',
      color: '#666'
    },
    actionsCell: {
      padding: '12px 16px',
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    },
    actionBtn: {
      border: '1px solid #d0d5dd',
      background: '#fff',
      borderRadius: '4px',
      padding: '6px 10px',
      fontSize: '12px',
      cursor: 'pointer'
    },
    editBtn: {
      color: '#1d4ed8'
    },
    resetBtn: {
      color: '#7c2d12'
    },
    deleteBtn: {
      color: '#b42318'
    },
    resultInfo: {
      padding: '0 20px',
      fontSize: '12px',
      color: '#999',
      paddingTop: '15px',
      borderTop: '1px solid #eee'
    },
    resultCount: {
      paddingTop: '12px',
      paddingBottom: '12px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerText}>
          <h1 style={styles.title}>Employees</h1>
          <p style={styles.subtitle}>View all employees in your department</p>
        </div>
        {canAddEmployee && (
          <Link to="/employees/add" style={styles.addButton}>
            + Add Employee
          </Link>
        )}
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

      {/* Search Filter */}
      <div style={styles.filterSection}>
        <label style={styles.filterLabel}>Search by Name, Email or Poste</label>
        <input
          style={styles.filterInput}
          type="text"
          placeholder="Enter employee name, email or poste..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div style={styles.tableSection}>
        {loading ? (
          <div style={styles.loadingMessage}>Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div style={styles.emptyMessage}>
            {searchTerm ? 'No employees match your search.' : 'No employees found.'}
          </div>
        ) : (
          <>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Full Name</th>
                  <th style={styles.tableHeaderCell}>Poste</th>
                  <th style={styles.tableHeaderCell}>Email</th>
                  <th style={styles.tableHeaderCell}>Department</th>
                  {canManageEmployees && <th style={styles.tableHeaderCell}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, idx) => (
                  <tr
                    key={idx}
                    style={styles.tableRow}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={styles.tableCell}>
                      {`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || `User #${emp.id}`}
                    </td>
                    <td style={styles.tableCell}>{emp.position || '-'}</td>
                    <td style={styles.tableCell}>{emp.email || `User #${emp.id}`}</td>
                    <td style={styles.tableCell}>
                      {emp.department?.name || emp.department_name || '-'}
                    </td>
                    {canManageEmployees && (
                      <td style={styles.actionsCell}>
                        <button
                          style={{ ...styles.actionBtn, ...styles.editBtn }}
                          onClick={() => handleEditEmployee(emp)}
                        >
                          Edit
                        </button>
                        <button
                          style={{ ...styles.actionBtn, ...styles.resetBtn }}
                          onClick={() => handleResetPassword(emp)}
                        >
                          Reset Password
                        </button>
                        <button
                          style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                          onClick={() => handleDeleteEmployee(emp)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{...styles.resultInfo, ...styles.resultCount}}>
              Showing {filteredEmployees.length} of {employees.length} total employees
            </div>
          </>
        )}
      </div>
    </div>
  );
}
