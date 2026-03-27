import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Profile from "../pages/Profile/Profile";
import Home from "../pages/Home";
import Dashboard from "../pages/dashboard/Dashboard";
import Attendance from "../pages/Attendance";
import Messagrie from "../pages/Messagrie";
import Conge from "../pages/conges/Conge";
import Notifications from "../pages/Notifications";
import Tasks from "../pages/Tasks";
import TeamEmployees from "../pages/TeamEmployees";
import ChefTasks from "../pages/ChefTasks";
import ChefLeaves from "../pages/ChefLeaves";
import Error from "../pages/Error";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
export default function Routers() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/team" element={<TeamEmployees />} />
          <Route path="/chef/tasks" element={<ChefTasks />} />
          <Route path="/chef/leaves" element={<ChefLeaves />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messagerie" element={<Messagrie />} />
          <Route path="/conge" element={<Conge />} />
        </Route>

        <Route path="*" element={<Error />} />
      </Routes>
    </>
  );
}
