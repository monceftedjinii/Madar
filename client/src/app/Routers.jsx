import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Auth/Login";
export default function Routers() {
  return (
    <>
      <Routes>
        {/* TODO: il faut cree les pages de notre projet  */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}
