// src/pages/Login.jsx
import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { FaCarSide } from "react-icons/fa";
import styles from "../styles/Auth.module.css";

const Login = () => {
  const { login } = useContext(AuthContext);
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const user = await login(credentials);

      /* ================= ROLE-BASED REDIRECT ================= */
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (user.role === "employee") {
        navigate("/employee/dashboard");
      } else {
        // customer
        navigate("/profile");
      }
    } catch (err) {
      setError(err.message || "Invalid email or password ❌");
    }
  };

  return (
    <div className={styles.authContainer}>
      <form onSubmit={handleSubmit} className={styles.authForm}>
        <h2 className={styles.authTitle}>🅿 ParkMate Login</h2>

        {error && <p className={styles.error}>{error}</p>}

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={credentials.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={credentials.password}
          onChange={handleChange}
          required
        />

        <button type="submit" className={styles.carButton}>
          <FaCarSide className={styles.carIcon} />
          <span>Login</span>
        </button>

        <p className={styles.switchText}>
          Don’t have an account?{" "}
          <Link to="/register" className={styles.link}>
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;