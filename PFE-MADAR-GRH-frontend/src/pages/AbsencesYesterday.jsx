import { useState, useEffect } from 'react';
import api from '../api';

export default function AbsencesYesterday() {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState({}); // tracks which employees are being processed
  const [comments, setComments] = useState({}); // stores comment for each employee
  const [rowMessages, setRowMessages] = useState({}); // stores success/error messages per employee

  useEffect(() => {
    fetchAbsences();
  }, []);

  const fetchAbsences = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/absences/yesterday/');
      setAbsences(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load absences');
    } finally {
      setLoading(false);
    }
  };

  const getYesterdayDate = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const handleIssueWarning = async (employeeId) => {
    try {
      setSubmitting(prev => ({ ...prev, [employeeId]: true }));
      setRowMessages(prev => ({ ...prev, [employeeId]: null }));

      const comment = comments[employeeId] || '';
      await api.post('/api/warnings/', {
        employee_id: employeeId,
        date: getYesterdayDate(),
        comment: comment
      });

      setRowMessages(prev => ({
        ...prev,
        [employeeId]: { type: 'success', text: 'Warning issued successfully' }
      }));

      // Clear comment after success
      setComments(prev => ({ ...prev, [employeeId]: '' }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setRowMessages(prev => ({ ...prev, [employeeId]: null }));
      }, 3000);
    } catch (err) {
      setRowMessages(prev => ({
        ...prev,
        [employeeId]: {
          type: 'error',
          text: err.response?.data?.error || 'Failed to issue warning'
        }
      }));
    } finally {
      setSubmitting(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const formatYesterdayDate = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
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
    dateInfo: {
      fontSize: '14px',
      color: '#999',
      marginTop: '5px'
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
    section: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
    tableCell: {
      padding: '12px',
      fontSize: '13px',
      color: '#666',
      verticalAlign: 'top'
    },
    commentInput: {
      width: '100%',
      padding: '6px 8px',
      fontSize: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      minHeight: '32px',
      resize: 'vertical'
    },
    warningButton: {
      backgroundColor: '#ff9800',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      marginTop: '8px',
      display: 'block',
      width: '100%'
    },
    warningButtonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    rowMessage: {
      fontSize: '12px',
      marginTop: '6px',
      padding: '4px 6px',
      borderRadius: '3px',
      display: 'block'
    },
    rowMessageSuccess: {
      backgroundColor: '#e6f7e6',
      color: '#065706',
      border: '1px solid #a9d8a9'
    },
    rowMessageError: {
      backgroundColor: '#ffe6e6',
      color: '#c33',
      border: '1px solid #f5a9a9'
    },
    actionCell: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
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
    }
  };

  if (loading) {
    return <div style={styles.container}><div style={styles.loadingMessage}>Loading absences...</div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Absences Yesterday</h1>
        <p style={styles.subtitle}>Employees who were absent on {formatYesterdayDate()}</p>
        <p style={styles.dateInfo}>Date: {getYesterdayDate()}</p>
      </div>

      {error && (
        <div style={{...styles.alertBanner, ...styles.errorBanner}}>
          <span>{error}</span>
          <button style={styles.closeButton} onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div style={styles.section}>
        {absences.length === 0 ? (
          <div style={styles.emptyMessage}>
            No absences reported yesterday. Great job! 🎉
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Employee Name</th>
                  <th style={styles.tableHeaderCell}>Department</th>
                  <th style={styles.tableHeaderCell}>Comment (optional)</th>
                  <th style={styles.tableHeaderCell}>Action</th>
                </tr>
              </thead>
              <tbody>
                {absences.map(absence => (
                  <tr key={absence.employee.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div style={{ fontWeight: 'bold' }}>
                        {absence.employee.first_name} {absence.employee.last_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {absence.employee.user.email}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      {absence.employee.department.name}
                    </td>
                    <td style={styles.tableCell}>
                      <textarea
                        style={styles.commentInput}
                        placeholder="Add optional comment"
                        value={comments[absence.employee.id] || ''}
                        onChange={(e) =>
                          setComments(prev => ({
                            ...prev,
                            [absence.employee.id]: e.target.value
                          }))
                        }
                      />
                    </td>
                    <td style={styles.tableCell}>
                      <button
                        style={{
                          ...styles.warningButton,
                          ...(submitting[absence.employee.id] ? styles.warningButtonDisabled : {})
                        }}
                        onClick={() => handleIssueWarning(absence.employee.id)}
                        disabled={submitting[absence.employee.id]}
                      >
                        {submitting[absence.employee.id] ? 'Issuing...' : 'Issue Warning'}
                      </button>
                      {rowMessages[absence.employee.id] && (
                        <span
                          style={{
                            ...styles.rowMessage,
                            ...(rowMessages[absence.employee.id].type === 'success'
                              ? styles.rowMessageSuccess
                              : styles.rowMessageError)
                          }}
                        >
                          {rowMessages[absence.employee.id].text}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '15px', fontSize: '12px', color: '#999' }}>
          Total absent employees: {absences.length}
        </div>
      </div>
    </div>
  );
}
