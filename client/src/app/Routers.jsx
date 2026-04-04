import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Profile from "../pages/Profile/Profile";
import Home from "../pages/Home";
import RoleDashboard from "../pages/dashboard/RoleDashboard";
import Attendance from "../pages/Attendance";
import Messagrie from "../pages/Messagrie";
import Conge from "../pages/conges/Conge";
import Notifications from "../pages/Notifications";
import Tasks from "../pages/Tasks";
import Evaluations from "../pages/Evaluations";
import Gpec from "../pages/Gpec";
import TeamEmployees from "../pages/TeamEmployees";
import ChefTasks from "../pages/ChefTasks";
import ChefAttendance from "../pages/ChefAttendance";
import ChefLeaves from "../pages/ChefLeaves";
import ChefDocuments from "../pages/ChefDocuments";
import ChefFormations from "../pages/ChefFormations";
import ChefReports from "../pages/ChefReports";
import ChefEvaluations from "../pages/ChefEvaluations";
import RhLeaves from "../pages/RhLeaves";
import RhAbsences from "../pages/RhAbsences";
import RhDocuments from "../pages/RhDocuments";
import RhFormations from "../pages/RhFormations";
import RhReports from "../pages/RhReports";
import RhEmployees from "../pages/RhEmployees";
import RhEvaluations from "../pages/RhEvaluations";
import RhGpec from "../pages/RhGpec";
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
          <Route path="/home" element={<RoleDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/gpec" element={<Gpec />} />
          <Route path="/team" element={<TeamEmployees />} />
          <Route path="/chef/tasks" element={<ChefTasks />} />
          <Route path="/chef/attendance" element={<ChefAttendance />} />
          <Route path="/chef/leaves" element={<ChefLeaves />} />
          <Route path="/chef/documents" element={<ChefDocuments />} />
          <Route path="/chef/formations" element={<ChefFormations />} />
          <Route path="/chef/reports" element={<ChefReports />} />
          <Route path="/chef/evaluations" element={<ChefEvaluations />} />
          <Route path="/rh/leaves" element={<RhLeaves />} />
          <Route path="/rh/absences" element={<RhAbsences />} />
          <Route path="/rh/documents" element={<RhDocuments />} />
          <Route path="/rh/formations" element={<RhFormations />} />
          <Route path="/rh/reports" element={<RhReports />} />
          <Route path="/rh/employees" element={<RhEmployees />} />
          <Route path="/rh/evaluations" element={<RhEvaluations />} />
          <Route path="/rh/gpec" element={<RhGpec />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messagerie" element={<Messagrie />} />
          <Route path="/conge" element={<Conge />} />
        </Route>

        <Route path="*" element={<Error />} />
      </Routes>
    </>
  );
}
