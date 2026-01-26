// src/pages/Profile.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import styles from "../styles/Profile.module.css";

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);

  const isEmployee = user?.role === "employee";

  const [isEditing, setIsEditing] = useState(false);
  const [entries, setEntries] = useState([]);
  const [activity, setActivity] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    vehicleNumber: "",
  });

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    if (!user) return;

    setFormData({
      name: user.name || "",
      email: user.email || "",
      vehicleNumber: user.vehicleNumber || "",
    });
  }, [user]);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    if (!user) return;

    fetch(`http://localhost:5000/api/users/${user._id}/entries`)
      .then((res) => res.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []));

    fetch(`http://localhost:5000/api/users/${user._id}/activity`)
      .then((res) => res.json())
      .then((data) => setActivity(Array.isArray(data) ? data : []));
  }, [user]);

  /* ================= SAVE PROFILE ================= */
  const handleSave = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/users/${user._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) throw new Error();

      const updatedUser = await res.json();
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);
      alert("✅ Profile updated");
    } catch {
      alert("❌ Profile update failed");
    }
  };

  /* ================= STATS ================= */
  const totalRevenue = useMemo(
    () => entries.reduce((sum, e) => sum + (e.fee || 0), 0),
    [entries]
  );

  const monthlySpent = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!e.exitTime) return;
      const key = new Date(e.exitTime).toLocaleString("en", {
        month: "short",
        year: "numeric",
      });
      map[key] = (map[key] || 0) + (e.fee || 0);
    });
    return Object.entries(map).map(([month, amount]) => ({
      month,
      amount,
    }));
  }, [entries]);

  const isParked = entries.some((e) => e.status === "Parked");

  if (!user) return <h2 style={{ padding: 20 }}>Please login</h2>;

  return (
    <div className={styles.profileContainer}>
      {/* ================= PROFILE HEADER ================= */}
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {user.name?.charAt(0).toUpperCase()}
        </div>

        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>

          <span className={isEmployee ? styles.employee : styles.user}>
            {isEmployee ? "Employee" : "Customer"}
          </span>

          {!isEmployee && (
            <span className={isParked ? styles.parked : styles.notParked}>
              {isParked ? "Parked" : "Not Parked"}
            </span>
          )}
        </div>
      </div>

      {/* ================= EDIT PROFILE ================= */}
      <div className={styles.card}>
        {isEditing ? (
          <>
            <input
              value={formData.name}
              placeholder="Name"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <input
              value={formData.email}
              placeholder="Email"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            {!isEmployee && (
              <input
                value={formData.vehicleNumber}
                placeholder="Vehicle Number"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vehicleNumber: e.target.value,
                  })
                }
              />
            )}
            <button onClick={handleSave}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
        )}
      </div>

      {/* ================= STATS ================= */}
      <div className={styles.statsGrid}>
        {isEmployee ? (
          <>
            <div className={styles.statCard}>
              <h4>📝 Entries Handled</h4>
              <p>{entries.filter(e => e.status === "Parked").length}</p>
            </div>

            <div className={styles.statCard}>
              <h4>🏁 Exits Completed</h4>
              <p>{entries.filter(e => e.status === "Exited").length}</p>
            </div>

            <div className={styles.statCard}>
              <h4>💰 Revenue Handled</h4>
              <p>₹{totalRevenue}</p>
            </div>
          </>
        ) : (
          <>
            <div className={styles.statCard}>
              <h4>🚗 Total Visits</h4>
              <p>{entries.length}</p>
            </div>

            <div className={styles.statCard}>
              <h4>💰 Total Spent</h4>
              <p>₹{totalRevenue}</p>
            </div>

            <div className={styles.statCard}>
              <h4>⏱ Last Visit</h4>
              <p>
                {entries[0]
                  ? new Date(entries[0].entryTime).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ================= MONTHLY SPENDING (CUSTOMER ONLY) ================= */}
      {!isEmployee && (
        <div className={styles.card}>
          <h3>📈 Monthly Spending</h3>
          {monthlySpent.length === 0 ? (
            <p>No spending data</p>
          ) : (
            <ResponsiveContainer height={220}>
              <LineChart data={monthlySpent}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  dataKey="amount"
                  stroke="#4f46e5"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ================= HISTORY ================= */}
      <div className={styles.card}>
        <h3>
          {isEmployee ? "🛠 Work History" : "🚗 Parking History"}
        </h3>

        {entries.length === 0 ? (
          <p>No records found</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Status</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id}>
                  <td>{e.vehicleNumber}</td>
                  <td>{new Date(e.entryTime).toLocaleString()}</td>
                  <td>
                    {e.exitTime
                      ? new Date(e.exitTime).toLocaleString()
                      : "-"}
                  </td>
                  <td>{e.status}</td>
                  <td>₹{e.fee || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= ACTIVITY LOGS ================= */}
      <div className={styles.card}>
        <h3>📋 Activity Timeline</h3>

        {activity.length === 0 ? (
          <p>No activity found</p>
        ) : (
          <ul className={styles.activityList}>
            {activity.map((a, i) => (
              <li key={i}>
                {a.action === "LOGIN" && "🔐 "}
                {a.action === "PARKING_ENTRY" && "🚗 "}
                {a.action === "PARKING_EXIT" && "🏁 "}
                {a.action === "EMPLOYEE_CREATED" && "👷 "}
                {a.action}
                <span>{new Date(a.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Profile;