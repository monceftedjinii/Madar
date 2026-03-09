import '../styles/KPIWidget.css'

function KPIWidget({ kpi }) {
  if (!kpi) return null

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing':
        return '📈'
      case 'decreasing':
        return '📉'
      case 'stable':
        return '➡️'
      default:
        return '❓'
    }
  }

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'increasing':
        return '#ff6b6b' // Red for increasing (bad for absenteeism)
      case 'decreasing':
        return '#51cf66' // Green for decreasing (good)
      case 'stable':
        return '#4dabf7' // Blue for stable
      default:
        return '#868e96'
    }
  }

  const getKPIIcon = (type) => {
    switch (type) {
      case 'employee_count':
        return '👥'
      case 'turnover':
        return '🔄'
      case 'absenteeism':
        return '📅'
      case 'evaluations':
        return '⭐'
      default:
        return '📊'
    }
  }

  const getKPITitle = (type) => {
    const titles = {
      employee_count: 'Total Employees',
      turnover: 'Turnover Rate',
      absenteeism: 'Absenteeism Rate',
      evaluations: 'Avg. Evaluation Score',
    }
    return titles[type] || type
  }

  return (
    <div className="kpi-widget">
      <div className="kpi-header">
        <span className="kpi-icon">{getKPIIcon(kpi.type)}</span>
        <h3 className="kpi-title">{getKPITitle(kpi.type)}</h3>
      </div>

      <div className="kpi-value-section">
        <div className="kpi-value">{kpi.value?.toFixed(2) || 'N/A'}</div>
        {kpi.unit && <span className="kpi-unit">{kpi.unit}</span>}
      </div>

      {kpi.trend && (
        <div className="kpi-trend" style={{ color: getTrendColor(kpi.trend) }}>
          <span className="trend-icon">{getTrendIcon(kpi.trend)}</span>
          <span className="trend-text">{kpi.trend}</span>
        </div>
      )}

      <div className="kpi-meta">
        <small>Calculated: {new Date(kpi.calculation_date).toLocaleDateString()}</small>
      </div>

      {kpi.details && Object.keys(kpi.details).length > 0 && (
        <div className="kpi-details">
          <h4>Details:</h4>
          <ul>
            {Object.entries(kpi.details).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default KPIWidget
