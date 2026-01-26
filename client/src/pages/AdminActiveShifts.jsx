import React, { useEffect, useState } from "react";
import styles from "../styles/AdminActiveShifts.module.css";

const REFRESH_INTERVAL = 5000; // 5 seconds

const AdminActiveShifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ACTIVE SHIFTS ================= */
  const fetchShifts = async () => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/admin/shifts"
      );
      const data = await res.json();

      // 🔐 SAFETY CHECK (VERY IMPORTANT)
      if (Array.isArray(data)) {
        setShifts(data);
      } else {
        console.error("Invalid shifts response:", data);
        setShifts([]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch shifts", err);
      setShifts([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
    const timer = setInterval(fetchShifts, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  /* ================= SHIFT DURATION ================= */
  const getDuration = (start) => {
    const diff = Date.now() - new Date(start);
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <h2 className={styles.center}>⏳ Loading active shifts...</h2>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>🟢 Active Employee Shifts</h1>

      {/* EMPTY STATE */}
      {shifts.length === 0 ? (
        <p className={styles.empty}>No active shifts right now</p>
      ) : (
        <div className={styles.grid}>
          {shifts.map((shift) => (
            <div key={shift._id} className={styles.card}>
              <h3 className={styles.name}>
                {shift.employeeId?.name || "Unknown"}
              </h3>

              <p className={styles.email}>
                {shift.employeeId?.email}
              </p>

              <div className={styles.meta}>
                <span>⏱ Started</span>
                <b>
                  {new Date(
                    shift.shiftStart
                  ).toLocaleTimeString()}
                </b>
              </div>

              <div className={styles.meta}>
                <span>🕒 Duration</span>
                <b>{getDuration(shift.shiftStart)}</b>
              </div>

              <span className={styles.active}>● ACTIVE</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminActiveShifts;