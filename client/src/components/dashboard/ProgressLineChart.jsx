import { Line } from "react-chartjs-2";
import { baseChartOptions } from "./chartConfig";

export default function ProgressLineChart({ values }) {
  const data = {
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
    datasets: [
      {
        label: "Monthly Progress",
        data: values,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.15)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#1d4ed8",
        pointBorderWidth: 0,
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

  return <Line data={data} options={options} />;
}
