import { useEffect, useState } from "react";
import axios from "axios";
import Dashboard from "./Dashboard";
import ChefDashboard from "./ChefDashboard";
import RhDashboard from "./RhDashboard";
import GrhDashboard from "./GrhDashboard";
import { getRoleContext } from "../../app/roleAccess";

export default function RoleDashboard() {
  const [role, setRole] = useState("");
  const [service, setService] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await axios.get("/api/whoami/");
        setRole(response.data?.role || "");
        setService(response.data?.service || "");
        setEmployeeRole(response.data?.employee_role || "");
      } catch (error) {
        console.error("Erreur determination role dashboard:", error);
        setRole("");
        setService("");
        setEmployeeRole("");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        Chargement du dashboard...
      </div>
    );
  }

  const context = getRoleContext({ role, service, employee_role: employeeRole });

  if (context.isChef) {
    return <ChefDashboard />;
  }

  if (context.isDrh) {
    return <GrhDashboard />;
  }

  if (context.isRh) {
    return <RhDashboard />;
  }

  return <Dashboard />;
}
