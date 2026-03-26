import { Bar } from "react-chartjs-2";
import { baseChartOptions } from "./chartConfig";

export default function PerformanceBarChart({ values }) {
  const data = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Weekly Performance",
        data: values,
        borderRadius: 10,
        backgroundColor: ["#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"],
      },
    ],
  };

  const options = {
    ...baseChartOptions,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b" },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: "#64748b" },
        grid: { color: "#e2e8f0" },
      },
    },
  };

  return <Bar data={data} options={options} />;
}
