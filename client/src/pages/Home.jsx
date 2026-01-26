import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Home.module.css";

const Home = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.overlay}>
          <h1 className={styles.title}>🚗 ParkMate</h1>
          <p className={styles.subtitle}>
            Smart Parking Management System – book, manage, and track your slots with ease.
          </p>

          {user ? (
            <>
              <h2 className={styles.welcome}>
                👋 Welcome, <span>{user.name || user.username}</span>!
              </h2>
              <p className={styles.details}>📧 {user.email}</p>
              {user.vehicleNumber && (
                <p className={styles.details}>🚙 Vehicle: {user.vehicleNumber}</p>
              )}

              <div className={styles.buttons}>
                <Link to="/slots" className={styles.ctaBtn}>
                  View Slots
                </Link>
                <button onClick={logout} className={styles.logoutBtn}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className={styles.buttons}>
              <Link to="/login" className={styles.ctaBtn}>
                Login
              </Link>
              <Link to="/register" className={styles.ctaBtn}>
                Register
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featureCard}>
          <h3>📍 Easy Slot Booking</h3>
          <p>Find and reserve parking slots in just a few clicks.</p>
        </div>
        <div className={styles.featureCard}>
          <h3>📊 Real-time Status</h3>
          <p>Check which slots are occupied or available instantly.</p>
        </div>
        <div className={styles.featureCard}>
          <h3>🔒 Secure Access</h3>
          <p>Your parking data and bookings are fully protected.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;