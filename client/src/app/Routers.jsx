import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Profile from "../pages/Profile/Profile";
export default function Routers() {
  return (
    <>
      <Routes>
        {/* TODO: il faut cree les pages de notre projet  */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path ="/profile" element={<Profile />} />
      </Routes>
    </>
  );
}
