// src/pages/Register.jsx
import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { FaCarSide } from "react-icons/fa";
import styles from "../styles/Auth.module.css";

const Register = () => {
  const { register, login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: "", // ✅ FIX: match backend field
    email: "",
    password: "",
    vehicleNumber: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // ✅ Call register from AuthContext
      const newUser = await register(formData);

      if (newUser) {
        // ✅ Auto login right after registration
        const loggedIn = await login({
          email: formData.email,
          password: formData.password,
        });

        if (loggedIn) {
          navigate("/"); // ✅ redirect to home after register+login
        }
      }
    } catch (err) {
      setError(err.message || "Registration failed. Try again ❌");
    }
  };

  return (
    <div className={styles.authContainer}>
      <form onSubmit={handleSubmit} className={styles.authForm}>
        <h2 className={styles.authTitle}>🅿 ParkMate Register</h2>

        {error && <p className={styles.error}>{error}</p>}

        <input
          type="text"
          name="name" // ✅ FIX
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="vehicleNumber"
          placeholder="Vehicle Number (Optional)"
          value={formData.vehicleNumber}
          onChange={handleChange}
        />

        <button type="submit" className={styles.carButton}>
          <FaCarSide className={styles.carIcon} />
          <span>Register</span>
        </button>

        <p className={styles.switchText}>
          Already have an account?{" "}
          <Link to="/login" className={styles.link}>
            Login here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;