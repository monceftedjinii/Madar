import React from "react";
import TextField from "@mui/material/TextField";
import "../../styles/login.css";
import logo from "../../assets/logo.jfif";
import login from "../../api/auth.api";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const handlechange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response = await login("/api/auth/token/", form);
      const token = response.access;
      localStorage.setItem("access_token", token);
      navigate("/profile")
      // console.log(status);
    } catch (error) {
      console.error("Login failed", error);
    }
  };
  return (
    <div className="login-page">
      <div className="login-container">
        <img src={logo} alt="Madar Logo" className="login-logo" />
        <h1 className="login-header">MADAR HOLDING</h1>
        <div className="login-subheader">Strategic Investments</div>
        <form className="loginForm" onSubmit={handleSubmit}>
          <TextField
            required
            id="outlined-required"
            label="Email"
            type="email"
            variant="outlined"
            fullWidth
            className="login-input"
            value={form.email}
            onChange={handlechange}
            name="email"
          />
          <TextField
            required
            id="outlined-password-input"
            label="Password"
            type="password"
            autoComplete="current-password"
            variant="outlined"
            fullWidth
            className="login-input"
            name="password"
            value={form.password}
            onChange={handlechange}
          />
          <button className="login-button" type="submit" onClick={handleSubmit}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
