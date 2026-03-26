import { Radar } from "react-chartjs-2";
import { baseChartOptions } from "./chartConfig";

export default function SkillsRadarChart({ values }) {
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
    ...baseChartOptions,
    scales: {
      r: {
        suggestedMin: 0,
        suggestedMax: 20,
        angleLines: { color: "#dbeafe" },
        grid: { color: "#e2e8f0" },
        pointLabels: {
          color: "#475569",
          font: {
            size: 12,
            weight: "600",
          },
        },
        ticks: {
          color: "#94a3b8",
          backdropColor: "transparent",
        },
      },
    },
  };

  return <Radar data={data} options={options} />;
}
