import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "./auth";

export default function PublicRoute() {
  return isAuthenticated() ? <Navigate to="/profile" replace /> : <Outlet />;
}
