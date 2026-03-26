import { Doughnut } from "react-chartjs-2";
import { baseChartOptions } from "./chartConfig";

export default function TasksDoughnutChart({ values }) {
  const data = {
    labels: ["Completed", "Pending", "Late"],
    datasets: [
      {
        data: [values.completed, values.pending, values.late],
        backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    ...baseChartOptions,
    cutout: "72%",
  };

  return <Doughnut data={data} options={options} />;
}
