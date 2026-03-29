import { Radar } from "react-chartjs-2";
import { getBaseChartOptions } from "./chartConfig";

export default function SkillsRadarChart({ values, dark = false }) {
  const data = {
    labels: [
      "Ponctualité",
      "Productivité",
      "Esprit d'équipe",
      "Discipline",
      "Qualité du travail",
    ],
    datasets: [
      {
        label: "Score de compétence",
        data: [
          values.punctuality,
          values.productivity,
          values.teamwork,
          values.discipline,
          values.qualityOfWork,
        ],
        backgroundColor: "rgba(59, 130, 246, 0.18)",
        borderColor: "#2563eb",
        pointBackgroundColor: "#1d4ed8",
      },
    ],
  };

  const options = {
    ...getBaseChartOptions(dark),
    scales: {
      r: {
        suggestedMin: 0,
        suggestedMax: 20,
        angleLines: { color: dark ? "rgba(148, 163, 184, 0.22)" : "#dbeafe" },
        grid: { color: dark ? "rgba(148, 163, 184, 0.18)" : "#e2e8f0" },
        pointLabels: {
          color: dark ? "#cbd5e1" : "#475569",
          font: {
            size: 12,
            weight: "600",
          },
        },
        ticks: {
          color: dark ? "#94a3b8" : "#94a3b8",
          backdropColor: "transparent",
        },
      },
    },
  };

  return <Radar data={data} options={options} />;
}
