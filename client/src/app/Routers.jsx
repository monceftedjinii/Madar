import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Profile from "../pages/Profile/Profile";
import Home from "../pages/Home";
import Attendance from "../pages/Attendance";
import Messagrie from "../pages/Messagrie";
import Error from "../pages/Error";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
export default function Routers() {
  return (
    <>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/messagerie" element={<Messagrie />} />
        </Route>

        <Route path="*" element={<Error />} />
      </Routes>
    </>
  );
}
