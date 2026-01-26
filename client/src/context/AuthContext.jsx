// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";

const API_URL = "http://localhost:5000/api";
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  /* ================= LOAD USER SAFELY ================= */
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed._id) {
          setUser(parsed);
        } else {
          localStorage.removeItem("user");
        }
      }
    } catch {
      localStorage.removeItem("user");
    }
  }, []);

  /* ================= REGISTER ================= */
  const register = async (formData) => {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Register failed");

    // ⚠️ your backend DOES NOT return user on register
    return true;
  };

  /* ================= LOGIN ================= */
  const login = async (credentials) => {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
  };

  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, register, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};