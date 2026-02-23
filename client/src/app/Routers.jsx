import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../pages/Auth/Login";
import Profile from "../pages/Profile/Profile";
import Home from "../pages/Home";
import Attendance from "../pages/Attendance";
import Error from "../pages/Error";
export default function Routers() {
  return (
    <>
      <Routes>
        {/* TODO: il faut cree les pages de notre projet  */}
        {/* <Route path="/" element={<Navigate to="/login" />} /> */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="*" element={<Error />} />
      
      </Routes>
    </>
  );
}
