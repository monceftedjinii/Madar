import { useState, useEffect } from 'react';
import api from '../api';

export default function MyAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null); // 'check-in' or 'check-out'
  const [actionMessage, setActionMessage] = useState(null); // success/error from action

  // Date filtering
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    // Set default date range: current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const fromFormatted = firstDayOfMonth.toISOString().split('T')[0];
    const toFormatted = today.toISOString().split('T')[0]; // Use today, not end of month

    setFromDate(fromFormatted);
    setToDate(toFormatted);
    fetchAttendance(fromFormatted, toFormatted);
  }, []);

  const fetchAttendance = async (from, to) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/attendance/me/', {
        params: {
          from: from,
          to: to
        }
      });
      setRecords(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionInProgress('check-in');
      setActionMessage(null);
      await api.post('/api/attendance/check-in/', {});
      setActionMessage({ type: 'success', text: 'Checked in successfully' });
      // Refresh attendance records
      setTimeout(() => {
        fetchAttendance(fromDate, toDate);
        setActionMessage(null);
      }, 2000);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to check in'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionInProgress('check-out');
      setActionMessage(null);
      await api.post('/api/attendance/check-out/', {});
      setActionMessage({ type: 'success', text: 'Checked out successfully' });
      // Refresh attendance records
      setTimeout(() => {
        fetchAttendance(fromDate, toDate);
        setActionMessage(null);
      }, 2000);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to check out'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleFilterChange = (newFromDate, newToDate) => {
    setFromDate(newFromDate);
    setToDate(newToDate);
    if (newFromDate && newToDate) {
      fetchAttendance(newFromDate, newToDate);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.slice(0, 5); // HH:MM
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
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
    section: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 15px 0'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      marginBottom: '15px'
    },
    button: {
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      flex: 1,
      maxWidth: '200px'
    },
    checkInButton: {
      backgroundColor: '#28a745',
      color: 'white'
    },
    checkOutButton: {
      backgroundColor: '#dc3545',
      color: 'white'
    },
    buttonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    messageBanner: {
      padding: '12px 16px',
      borderRadius: '4px',
      marginBottom: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    successMessage: {
      backgroundColor: '#e6f7e6',
      color: '#065706',
      border: '1px solid #a9d8a9'
    },
    errorMessage: {
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
    filterGroup: {
      display: 'grid',
      gridTemplateColumns: '150px 150px 1fr',
      gap: '12px',
      alignItems: 'end',
      marginBottom: '15px'
    },
    filterLabel: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '5px'
    },
    filterInput: {
      padding: '8px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      width: '100%',
      boxSizing: 'border-box'
    },
    filterButton: {
      padding: '8px 12px',
      fontSize: '12px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
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
    return <div style={styles.container}><div style={styles.loadingMessage}>Loading attendance...</div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Attendance</h1>
        <p style={styles.subtitle}>Check in/out and view your attendance history</p>
      </div>

      {/* Check-in/Check-out Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Daily Check-in/Check-out</h2>
        <div style={styles.buttonGroup}>
          <button
            style={{
              ...styles.button,
              ...styles.checkInButton,
              ...(actionInProgress ? styles.buttonDisabled : {})
            }}
            onClick={handleCheckIn}
            disabled={actionInProgress !== null}
          >
            {actionInProgress === 'check-in' ? 'Checking in...' : '✓ Check In'}
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.checkOutButton,
              ...(actionInProgress ? styles.buttonDisabled : {})
            }}
            onClick={handleCheckOut}
            disabled={actionInProgress !== null}
          >
            {actionInProgress === 'check-out' ? 'Checking out...' : '✗ Check Out'}
          </button>
        </div>

        {actionMessage && (
          <div style={{
            ...styles.messageBanner,
            ...(actionMessage.type === 'success' ? styles.successMessage : styles.errorMessage)
          }}>
            <span>{actionMessage.text}</span>
            <button
              style={styles.closeButton}
              onClick={() => setActionMessage(null)}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Attendance History Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Attendance History</h2>

        {/* Date Filters */}
        <div style={styles.filterGroup}>
          <div>
            <label style={styles.filterLabel}>From Date</label>
            <input
              style={styles.filterInput}
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label style={styles.filterLabel}>To Date</label>
            <input
              style={styles.filterInput}
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button
            style={styles.filterButton}
            onClick={() => handleFilterChange(fromDate, toDate)}
          >
            Apply Filter
          </button>
        </div>

        {error && (
          <div style={{...styles.messageBanner, ...styles.errorMessage}}>
            <span>{error}</span>
            <button
              style={styles.closeButton}
              onClick={() => {
                setError(null);
                fetchAttendance(fromDate, toDate);
              }}
            >
              ×
            </button>
          </div>
        )}

        {records.length === 0 ? (
          <div style={styles.emptyMessage}>No attendance records for the selected period</div>
        ) : (
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.tableHeaderCell}>Date</th>
                <th style={styles.tableHeaderCell}>Check In Time</th>
                <th style={styles.tableHeaderCell}>Check Out Time</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr key={idx} style={styles.tableRow}>
                  <td style={styles.tableCell}>{formatDate(record.date)}</td>
                  <td style={styles.tableCell}>{formatTime(record.check_in_time)}</td>
                  <td style={styles.tableCell}>{formatTime(record.check_out_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: '15px', fontSize: '12px', color: '#999' }}>
          Showing {records.length} record(s) from {fromDate} to {toDate}
        </div>
      </div>
    </div>
  );
}
