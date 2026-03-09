import { useState, useEffect } from 'react'
import api from '../api'
import KPIWidget from '../components/KPIWidget'
import ChartWidget from '../components/ChartWidget'
import '../styles/AnalyticsDashboard.css'

function AnalyticsDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    service_id: '',
    contract_type: '',
  })

  // Fetch dashboard data
  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams(filters)
      params.append('auto_refresh', autoRefresh)

      const response = await api.get('/api/dashboard/', { params })
      setDashboard(response.data)
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err.response?.data?.error || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchDashboard()
  }, [])

  // Auto-refresh interval
  useEffect(() => {
    let interval
    if (autoRefresh) {
      interval = setInterval(fetchDashboard, 5 * 60 * 1000) // 5 minutes
    }
    return () => clearInterval(interval)
  }, [autoRefresh, filters])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleRefresh = async () => {
    try {
      const response = await api.post('/api/dashboard/refresh/', filters)
      setDashboard(response.data)
    } catch (err) {
      console.error('Error refreshing dashboard:', err)
      setError('Failed to refresh dashboard')
    }
  }

  return (
    <div className="analytics-container">
      <header className="analytics-header">
        <h1>📊 Analytics Dashboard</h1>
        <div className="header-controls">
          <button
            onClick={handleRefresh}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
          <label className="auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh every 5 min
          </label>
        </div>
      </header>

      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label>Service ID</label>
            <input
              type="text"
              name="service_id"
              placeholder="e.g., RH, IT"
              value={filters.service_id}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label>Contract Type</label>
            <select
              name="contract_type"
              value={filters.contract_type}
              onChange={handleFilterChange}
            >
              <option value="">All</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="STAGE">STAGE</option>
            </select>
          </div>
        </div>
        <button onClick={fetchDashboard} className="btn btn-secondary">
          Apply Filters
        </button>
      </div>

      {error && (
        <div className="error-box">
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {loading && !dashboard ? (
        <div className="loading-spinner">
          <p>Loading dashboard...</p>
        </div>
      ) : dashboard ? (
        <>
          <div className="period-info">
            <p>
              📅 Period: <strong>{dashboard.period.start_date}</strong> to{' '}
              <strong>{dashboard.period.end_date}</strong>
            </p>
            <p>
              Last Updated: <strong>{new Date(dashboard.last_updated).toLocaleString()}</strong>
            </p>
            <p>
              Refresh Strategy: <strong>{dashboard.refresh_strategy}</strong>
            </p>
          </div>

          <div className="widgets-grid">
            {dashboard.widgets && dashboard.widgets.length > 0 ? (
              dashboard.widgets.map((widget, idx) => (
                <div key={idx} className="widget-card">
                  {widget.error ? (
                    <div className="widget-error">
                      <p>❌ {widget.type}</p>
                      <p>{widget.error}</p>
                    </div>
                  ) : (
                    <>
                      <KPIWidget kpi={widget.kpi} />
                      {widget.chart && <ChartWidget chart={widget.chart} />}
                    </>
                  )}
                </div>
              ))
            ) : (
              <p>No widgets available</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default AnalyticsDashboard
