import { Line } from "react-chartjs-2";
import { getBaseChartOptions } from "./chartConfig";

export default function ProgressLineChart({ values, dark = false }) {
  if (!values || !Array.isArray(values)) {
    return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>Aucune donnée</div>;
  }
  const data = {
    labels: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"],
    datasets: [
      {
        label: "Progression mensuelle",
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
    ...getBaseChartOptions(dark),
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: dark ? "#cbd5e1" : "#64748b" },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: dark ? "#cbd5e1" : "#64748b" },
        grid: { color: dark ? "rgba(148, 163, 184, 0.18)" : "#e2e8f0" },
      },
    },
  };

  return <Line data={data} options={options} />;
}
