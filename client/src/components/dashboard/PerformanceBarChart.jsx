import { Bar } from "react-chartjs-2";
import { getBaseChartOptions } from "./chartConfig";

export default function PerformanceBarChart({
  values,
  labels = ["Semaine 1", "Semaine 2", "Semaine 3", "Semaine 4"],
  datasetLabel = "Performance hebdomadaire",
  max = 100,
  colors = ["#bfdbfe", "#93c5fd", "#60a5fa", "#2563eb"],
  dark = false,
}) {
  const data = {
    labels,
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
        ticks: { color: dark ? "#cbd5e1" : "#64748b" },
        grid: { color: dark ? "rgba(148, 163, 184, 0.18)" : "#e2e8f0" },
      },
    },
  };

  return <Bar data={data} options={options} />;
}
