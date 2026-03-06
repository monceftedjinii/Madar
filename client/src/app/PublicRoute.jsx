import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function PublicRoute() {
  const token = localStorage.getItem("access_token");
  return token ? <Navigate to="/profile" replace /> : <Outlet />;
}

