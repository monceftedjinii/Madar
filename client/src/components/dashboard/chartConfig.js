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

export const baseChartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        boxWidth: 12,
        boxHeight: 12,
        color: "#475569",
        font: {
          size: 12,
          weight: "600",
        },
      },
    },
  },
};
