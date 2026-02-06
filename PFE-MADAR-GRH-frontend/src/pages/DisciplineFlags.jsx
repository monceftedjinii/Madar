import { useState, useEffect } from 'react';
import api from '../api';

export default function DisciplineFlags() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [authorizedError, setAuthorizedError] = useState(null);

  // Get user from localStorage to check role
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAuthorized = user.role === 'RH_SENIOR' || user.role === 'GRH';

  useEffect(() => {
    if (isAuthorized) {
      fetchFlags();
    }
  }, [isAuthorized]);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      setError(null);
      setAuthorizedError(null);
      const response = await api.get('/api/discipline/flags/');
      setFlags(response.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setAuthorizedError('You do not have permission to view discipline flags');
      } else {
        setError(err.response?.data?.error || 'Failed to load discipline flags');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredFlags = flags.filter(flag => {
    const query = searchQuery.toLowerCase();
    const employeeName = `${flag.employee.first_name} ${flag.employee.last_name}`.toLowerCase();
    const employeeEmail = flag.employee.user.email.toLowerCase();
    return employeeName.includes(query) || employeeEmail.includes(query);
  });

  const styles = {
    container: {
      maxWidth: '1200px',
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
    unauthorizedBanner: {
      backgroundColor: '#fff3cd',
      color: '#856404',
      border: '1px solid #ffeaa7'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '18px',
      color: 'inherit',
      padding: '0'
    },
    section: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    filterGroup: {
      marginBottom: '20px',
      display: 'flex',
      gap: '12px',
      alignItems: 'end'
    },
    filterLabel: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '6px'
    },
    filterInput: {
      padding: '8px 12px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      width: '250px',
      boxSizing: 'border-box'
    },
    tableWrapper: {
      overflowX: 'auto'
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
      padding: '12px',
      textAlign: 'left',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#333'
    },
    tableRow: {
      borderBottom: '1px solid #ddd'
    },
    tableRowHover: {
      backgroundColor: '#f9f9f9'
    },
    tableCell: {
      padding: '12px',
      fontSize: '13px',
      color: '#666'
    },
    warningBadge: {
      display: 'inline-block',
      backgroundColor: '#fff3cd',
      color: '#856404',
      padding: '4px 8px',
      borderRadius: '3px',
      fontSize: '12px',
      fontWeight: 'bold'
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
      fontSize: '14px',
      backgroundColor: '#f9f9f9',
      borderRadius: '4px'
    },
    authorizedErrorContainer: {
      textAlign: 'center',
      padding: '40px 20px'
    },
    authorizedErrorMessage: {
      fontSize: '16px',
      color: '#c33',
      marginBottom: '15px'
    },
    authorizedErrorDescription: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '20px'
    },
    retryButton: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    }
  };

  if (loading) {
    return <div style={styles.container}><div style={styles.loadingMessage}>Loading discipline flags...</div></div>;
  }

  if (!isAuthorized) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Discipline Flags</h1>
        </div>
        <div style={styles.section}>
          <div style={styles.authorizedErrorContainer}>
            <div style={styles.authorizedErrorMessage}>⛔ Not Authorized</div>
            <div style={styles.authorizedErrorDescription}>
              You do not have permission to access this page.
              <br />
              Only RH_SENIOR and GRH roles can view discipline flags.
            </div>
            <div>Your current role: <strong>{user.role}</strong></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Discipline Flags</h1>
        <p style={styles.subtitle}>Warning history and discipline tracking for employees</p>
      </div>

      {authorizedError && (
        <div style={{...styles.alertBanner, ...styles.unauthorizedBanner}}>
          <span>{authorizedError}</span>
          <button style={styles.closeButton} onClick={() => setAuthorizedError(null)}>×</button>
        </div>
      )}

      {error && (
        <div style={{...styles.alertBanner, ...styles.errorBanner}}>
          <span>{error}</span>
          <button style={styles.closeButton} onClick={() => fetchFlags()}>×</button>
        </div>
      )}

      <div style={styles.section}>
        {flags.length > 0 && (
          <div style={styles.filterGroup}>
            <div>
              <label style={styles.filterLabel}>Search by Employee Name or Email</label>
              <input
                style={styles.filterInput}
                type="text"
                placeholder="Enter name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {filteredFlags.length} of {flags.length} record(s)
            </div>
          </div>
        )}

        {flags.length === 0 ? (
          <div style={styles.emptyMessage}>
            No discipline flags on record. All clear! ✓
          </div>
        ) : filteredFlags.length === 0 ? (
          <div style={styles.emptyMessage}>
            No records match your search
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Employee Name</th>
                  <th style={styles.tableHeaderCell}>Department</th>
                  <th style={styles.tableHeaderCell}>Warning Count</th>
                  <th style={styles.tableHeaderCell}>Month</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlags.map((flag, idx) => (
                  <tr key={idx} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div style={{ fontWeight: 'bold' }}>
                        {flag.employee.first_name} {flag.employee.last_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {flag.employee.user.email}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      {flag.employee.department.name}
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.warningBadge}>
                        {flag.warning_count} warning{flag.warning_count !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {flag.month}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {flags.length > 0 && (
          <div style={{ marginTop: '15px', fontSize: '12px', color: '#999' }}>
            Total discipline flags: {flags.length} | Filtered: {filteredFlags.length}
          </div>
        )}
      </div>
    </div>
  );
}
