import { Bar } from "react-chartjs-2";
import { getBaseChartOptions } from "./chartConfig";

export default function PerformanceBarChart({
  values,
  labels,
  currentWeekIndex = null,
  datasetLabel = "Présence hebdomadaire",
  max = 100,
  unit = "%",
  dark = false,
}) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13 }}>Aucune donnée</div>;
  }
  const n = values.length;
  const defaultLabels = Array.from({ length: n }, (_, i) => `S${i + 1}`);
  const resolvedLabels = labels && labels.length === n ? labels : defaultLabels;

  // Colors: current week = yellow, past weeks = blue shades
  const blueShades = ["#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb", "#1d4ed8"];
  const colors = values.map((_, i) => {
    if (i === currentWeekIndex) return "#eab308"; // yellow — in progress
    return blueShades[Math.min(i, blueShades.length - 1)];
  });

  const data = {
    labels: resolvedLabels,
    datasets: [
      {
        label: datasetLabel,
        data: values,
        borderRadius: 10,
        backgroundColor: colors,
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
        max,
        ticks: {
          color: dark ? "#cbd5e1" : "#64748b",
          callback: (v) => unit ? `${v}${unit}` : v,
        },
        grid: { color: dark ? "rgba(148, 163, 184, 0.18)" : "#e2e8f0" },
      },
    },
  };

  return <Bar data={data} options={options} />;
}
