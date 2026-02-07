import React from "react";
import TextField from "@mui/material/TextField";
import "../../styles/login.css";
import logo from "../../assets/logo.jfif";

import { useState  , } from "react";
export default function Login() {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
  };
  return (
    <div className="login-page" >
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
          <button className="login-button" type="submit" onClick={handleSubmit} >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
