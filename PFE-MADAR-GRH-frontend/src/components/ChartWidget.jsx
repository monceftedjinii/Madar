import { useEffect, useRef } from 'react'
import '../styles/ChartWidget.css'

function ChartWidget({ chart }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!chart || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)

    const labels = chart.labels || []
    const values = chart.values || []
    const type = chart.type || 'bar'

    if (!labels.length || !values.length) {
      ctx.fillStyle = '#999'
      ctx.font = '14px Arial'
      ctx.fillText('No data to display', 50, height / 2)
      return
    }

    const padding = 50
    const chartWidth = width - 2 * padding
    const chartHeight = height - 2 * padding

    // Draw axes
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(padding, padding)
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Get max value for scaling
    const maxValue = Math.max(...values, 1)

    if (type === 'bar') {
      drawBarChart(ctx, labels, values, maxValue, padding, chartWidth, chartHeight, width, height)
    } else if (type === 'line') {
      drawLineChart(ctx, labels, values, maxValue, padding, chartWidth, chartHeight, width, height)
    } else if (type === 'pie') {
      drawPieChart(ctx, labels, values, width / 2, height / 2, 100)
    }

    // Draw labels
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    const labelGap = chartWidth / labels.length
    labels.forEach((label, i) => {
      ctx.fillText(label, padding + (i + 0.5) * labelGap, height - padding + 20)
    })
  }, [chart])

  return (
    <div className="chart-widget">
      <h4 className="chart-title">{chart?.title || 'Chart'}</h4>
      <div className="chart-container">
        <canvas
          ref={canvasRef}
          width={500}
          height={300}
          style={{ border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>
      {chart?.meta && (
        <div className="chart-meta">
          <small>
            Unit: <strong>{chart.meta.unit}</strong> | Type:{' '}
            <strong>{chart.type}</strong>
          </small>
        </div>
      )}
    </div>
  )
}

function drawBarChart(ctx, labels, values, maxValue, padding, chartWidth, chartHeight, width, height) {
  const barWidth = chartWidth / labels.length * 0.8
  const barGap = chartWidth / labels.length * 0.2

  ctx.fillStyle = '#4dabf7'
  values.forEach((value, i) => {
    const barHeight = (value / maxValue) * chartHeight
    const x = padding + i * (chartWidth / labels.length) + barGap / 2
    const y = height - padding - barHeight

    ctx.fillRect(x, y, barWidth, barHeight)

    // Draw value on top of bar
    ctx.fillStyle = '#333'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(value.toFixed(1), x + barWidth / 2, y - 5)
    ctx.fillStyle = '#4dabf7'
  })
}

function drawLineChart(ctx, labels, values, maxValue, padding, chartWidth, chartHeight, width, height) {
  ctx.strokeStyle = '#ff6b6b'
  ctx.lineWidth = 2
  ctx.beginPath()

  values.forEach((value, i) => {
    const x = padding + (i / (labels.length - 1 || 1)) * chartWidth
    const y = height - padding - (value / maxValue) * chartHeight

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()

  // Draw points
  ctx.fillStyle = '#ff6b6b'
  values.forEach((value, i) => {
    const x = padding + (i / (labels.length - 1 || 1)) * chartWidth
    const y = height - padding - (value / maxValue) * chartHeight
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawPieChart(ctx, labels, values, centerX, centerY, radius) {
  const total = values.reduce((a, b) => a + b, 0)
  let currentAngle = -Math.PI / 2

  const colors = ['#ff6b6b', '#51cf66', '#4dabf7', '#ffd43b', '#a78bfa', '#ff922b']

  values.forEach((value, i) => {
    const sliceAngle = (value / total) * 2 * Math.PI
    ctx.fillStyle = colors[i % colors.length]
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
    ctx.lineTo(centerX, centerY)
    ctx.fill()

    // Draw label
    const labelAngle = currentAngle + sliceAngle / 2
    const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7)
    const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${((value / total) * 100).toFixed(0)}%`, labelX, labelY)

    currentAngle += sliceAngle
  })
}

export default ChartWidget
