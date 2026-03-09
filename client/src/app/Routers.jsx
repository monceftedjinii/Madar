import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Profile from "../pages/Profile/Profile";
import Home from "../pages/Home";
import Attendance from "../pages/Attendance";
import Messagrie from "../pages/Messagrie";
import Conge from "../pages/conges/Conge";
import Error from "../pages/Error";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
export default function Routers() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/messagerie" element={<Messagrie />} />
          <Route path="/conge" element={<Conge />} />
        </Route>

        <Route path="*" element={<Error />} />
      </Routes>
    </>
  );
}
