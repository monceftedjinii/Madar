import { useEffect, useState } from "react";
import axios from "axios";
import Dashboard from "./Dashboard";
import ChefDashboard from "./ChefDashboard";
import RhDashboard from "./RhDashboard";
import GrhDashboard from "./GrhDashboard";

export default function RoleDashboard() {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await axios.get("/api/whoami/");
        setRole(response.data?.role || "");
      } catch (error) {
        console.error("Erreur determination role dashboard:", error);
        setRole("");
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

  if (role === "CHEF") {
    return <ChefDashboard />;
  }

  if (role === "GRH") {
    return <GrhDashboard />;
  }

  if (["RH_SIMPLE", "RH_AGENT", "RH_SENIOR"].includes(role)) {
    return <RhDashboard />;
  }

  return <Dashboard />;
}
