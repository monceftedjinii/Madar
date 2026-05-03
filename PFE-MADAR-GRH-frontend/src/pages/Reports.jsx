import { useState, useEffect } from 'react';
import api from '../api';

export default function Reports() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Initialize with current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const fromFormatted = firstDay.toISOString().split('T')[0];
    const toFormatted = today.toISOString().split('T')[0];

    setFromDate(fromFormatted);
    setToDate(toFormatted);
    fetchMetrics(fromFormatted, toFormatted);
  }, []);

  const fetchMetrics = async (from, to) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/reports/summary/', {
        params: {
          from: from,
          to: to
        }
      });
      setMetrics(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger les rapports');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    if (fromDate && toDate) {
      fetchMetrics(fromDate, toDate);
    } else {
      setError('Veuillez sélectionner les deux dates');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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
    filterSection: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    filterGroup: {
      display: 'flex',
      gap: '12px',
      alignItems: 'end',
      flexWrap: 'wrap'
    },
    filterField: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '6px'
    },
    input: {
      padding: '8px 12px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      width: '200px',
      boxSizing: 'border-box'
    },
    button: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 'bold'
    },
    buttonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
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
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      marginBottom: '20px'
    },
    metricCard: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textAlign: 'center'
    },
    metricLabel: {
      fontSize: '13px',
      color: '#666',
      marginBottom: '10px',
      fontWeight: '500'
    },
    metricValue: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#007bff',
      margin: '0'
    },
    metricsTable: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    tableTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '15px'
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
      color: '#666'
    },
    loadingMessage: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#666',
      backgroundColor: 'white',
      borderRadius: '6px',
      border: '1px solid #ddd'
    },
    dateInfo: {
      fontSize: '12px',
      color: '#999',
      marginTop: '10px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Rapports &amp; Résumé</h1>
        <p style={styles.subtitle}>Consulter les métriques et statistiques du système</p>
      </div>

      {/* Filter Section */}
      <div style={styles.filterSection}>
        <div style={styles.filterGroup}>
          <div style={styles.filterField}>
            <label style={styles.label}>Date de début</label>
            <input
              style={styles.input}
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Date de fin</label>
            <input
              style={styles.input}
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <button
            style={{...styles.button, ...(loading ? styles.buttonDisabled : {})}}
            onClick={handleApplyFilter}
            disabled={loading}
          >
            {loading ? 'Chargement...' : 'Appliquer le filtre'}
          </button>
        </div>
        {fromDate && toDate && (
          <div style={styles.dateInfo}>
            Affichage des métriques du {formatDate(fromDate)} au {formatDate(toDate)}
          </div>
        )}
      </div>

      {error && (
        <div style={{...styles.alertBanner, ...styles.errorBanner}}>
          <span>{error}</span>
          <button style={styles.closeButton} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading && (
        <div style={styles.loadingMessage}>Chargement des métriques...</div>
      )}

      {!loading && metrics && (
        <>
          {/* Key Metrics Cards */}
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Total employés</div>
              <div style={styles.metricValue}>{metrics.employees_count || 0}</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Jours de présence</div>
              <div style={styles.metricValue}>{metrics.attendance_days_count || 0}</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Avertissements émis</div>
              <div style={styles.metricValue}>{metrics.warnings_count || 0}</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Signalements disciplinaires</div>
              <div style={styles.metricValue}>{metrics.discipline_flags_count || 0}</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Documents créés</div>
              <div style={styles.metricValue}>{metrics.documents_created || 0}</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Documents validés</div>
              <div style={styles.metricValue}>{metrics.documents_validated || 0}</div>
            </div>
          </div>

          {/* Leave Requests Table */}
          {metrics.leaves_pending !== undefined && (
            <div style={styles.metricsTable}>
              <div style={styles.tableTitle}>Résumé des demandes de congé</div>
              <table style={styles.table}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={styles.tableHeaderCell}>Statut</th>
                    <th style={styles.tableHeaderCell}>Nombre</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.tableRow}>
                    <td style={styles.tableCell}>En attente</td>
                    <td style={styles.tableCell}>
                      <strong>{metrics.leaves_pending || 0}</strong>
                    </td>
                  </tr>
                  <tr style={styles.tableRow}>
                    <td style={styles.tableCell}>Accepté</td>
                    <td style={styles.tableCell}>
                      <strong>{metrics.leaves_accepted || 0}</strong>
                    </td>
                  </tr>
                  <tr style={styles.tableRow}>
                    <td style={styles.tableCell}>Refusé</td>
                    <td style={styles.tableCell}>
                      <strong>{metrics.leaves_refused || 0}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Info */}
          <div style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
            Dernière mise à jour : {new Date().toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
