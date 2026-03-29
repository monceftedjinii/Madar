import { Doughnut } from "react-chartjs-2";
import { getBaseChartOptions } from "./chartConfig";

export default function TasksDoughnutChart({ values, dark = false }) {
  const data = {
    labels: ["Terminées", "En attente", "En retard"],
    datasets: [
      {
        data: [values.completed, values.pending, values.late],
        backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    ...getBaseChartOptions(dark),
    cutout: "72%",
  };

  return <Doughnut data={data} options={options} />;
}
