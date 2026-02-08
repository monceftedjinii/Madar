import { useState, useEffect } from 'react';
import api from '../api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Client-side filter by name or email
  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const email = `${emp.email || ''}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || email.includes(term);
  });

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
        <h1 style={styles.title}>Employees</h1>
        <p style={styles.subtitle}>View all employees in your department</p>
      </div>

      {error && (
        <div style={{...styles.alertBanner, ...styles.errorBanner}}>
          <span>{error}</span>
          <button style={styles.closeButton} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Search Filter */}
      <div style={styles.filterSection}>
        <label style={styles.filterLabel}>Search by Name or Email</label>
        <input
          style={styles.filterInput}
          type="text"
          placeholder="Enter employee name or email..."
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
                  <th style={styles.tableHeaderCell}>Email</th>
                  <th style={styles.tableHeaderCell}>Department</th>
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
                    <td style={styles.tableCell}>{emp.email || `User #${emp.id}`}</td>
                    <td style={styles.tableCell}>
                      {emp.department?.name || emp.department_name || '-'}
                    </td>
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
