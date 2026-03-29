import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
);

export function getBaseChartOptions(dark = false) {
  return {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          color: dark ? "#cbd5e1" : "#475569",
          font: {
            size: 12,
            weight: "600",
          },
        },
      },
    },
  };
}
