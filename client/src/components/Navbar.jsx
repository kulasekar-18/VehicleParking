import React, { useState, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaTachometerAlt,
  FaUserCircle,
  FaSignInAlt,
  FaUserPlus,
  FaSignOutAlt,
  FaParking,
  FaReceipt,
} from "react-icons/fa";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Navbar.module.css";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate("/login");
  };

  return (
    <nav className={styles.navbar}>
      {/* LOGO */}
      <div className={styles.logo} onClick={() => navigate("/")}>
        🚗 ParkMate
      </div>

      {/* HAMBURGER */}
      <div
        className={`${styles.hamburger} ${isOpen ? styles.active : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span />
        <span />
        <span />
      </div>

      {/* LINKS */}
      <div className={`${styles.links} ${isOpen ? styles.open : ""}`}>
        {/* HOME */}
        <Link
          to="/"
          className={`${styles.link} ${
            location.pathname === "/" ? styles.activeLink : ""
          }`}
          onClick={() => setIsOpen(false)}
        >
          <FaHome /> <span>Home</span>
        </Link>

        {/* ================= USER ================= */}
        {user?.role === "user" && (
          <>
            <Link
              to="/book-slot"
              className={`${styles.link} ${
                location.pathname === "/book-slot"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FaParking /> <span>Book Slot</span>
            </Link>

            <Link
              to="/profile"
              className={`${styles.link} ${
                location.pathname === "/profile"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FaUserCircle /> <span>Profile</span>
            </Link>
          </>
        )}

        {/* ================= EMPLOYEE ================= */}
        {user?.role === "employee" && (
          <>
            <Link
              to="/employee/dashboard"
              className={`${styles.link} ${
                location.pathname === "/employee/dashboard"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FaTachometerAlt /> <span>Employee Dashboard</span>
            </Link>

            <Link
              to="/entry"
              className={`${styles.link} ${
                location.pathname === "/entry"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              🚗 <span>Vehicle Entry</span>
            </Link>

            <Link
              to="/exit"
              className={`${styles.link} ${
                location.pathname === "/exit"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              🧾 <span>Vehicle Exit</span>
            </Link>
          </>
        )}

        {/* ================= ADMIN ================= */}
        {user?.role === "admin" && (
          <>
            <Link
              to="/admin/dashboard"
              className={`${styles.link} ${
                location.pathname === "/admin/dashboard"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FaTachometerAlt /> <span>Dashboard</span>
            </Link>

            <Link
              to="/admin/slots"
              className={`${styles.link} ${
                location.pathname === "/admin/slots"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              🅿 <span>Manage Slots</span>
            </Link>

            {/* ✅ RECEIPT HISTORY (ADDED) */}
            <Link
              to="/admin/receipts"
              className={`${styles.link} ${
                location.pathname === "/admin/receipts"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FaReceipt /> <span>Receipt History</span>
            </Link>

            {/* ✅ ACTIVE SHIFTS */}
            <Link
              to="/admin/shifts"
              className={`${styles.link} ${
                location.pathname === "/admin/shifts"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              🟢 <span>Active Shifts</span>
            </Link>
          </>
        )}

        {/* ================= AUTH ================= */}
        {!user ? (
          <>
            <Link
              to="/login"
              className={`${styles.link} ${
                location.pathname === "/login"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FaSignInAlt /> <span>Login</span>
            </Link>

            <Link
              to="/register"
              className={`${styles.link} ${
                location.pathname === "/register"
                  ? styles.activeLink
                  : ""
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FaUserPlus /> <span>Register</span>
            </Link>
          </>
        ) : (
          <button onClick={handleLogout} className={styles.linkButton}>
            <FaSignOutAlt /> <span>Logout</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;