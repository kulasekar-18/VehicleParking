// src/pages/AdminEmployees.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import styles from "../styles/AdminUsers.module.css";

/* CHARTS */
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const INACTIVE_DAYS = 30;

const AdminEmployees = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  /* analytics */
  const [logs, setLogs] = useState([]);
  const [entries, setEntries] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  /* ================= FETCH USERS ================= */
  const fetchUsers = async () => {
    const res = await fetch("http://localhost:5000/api/admin/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ================= ONLY EMPLOYEES ================= */
  const employees = useMemo(
    () => users.filter((u) => u.role === "employee"),
    [users]
  );

  /* ================= DELETE EMPLOYEE ================= */
  const deleteEmployee = async (id) => {
    if (!window.confirm("Delete this employee?")) return;

    const res = await fetch(
      `http://localhost:5000/api/admin/users/${id}`,
      { method: "DELETE" }
    );

    if (res.ok) fetchUsers();
    else alert("Delete failed");
  };

  /* ================= VIEW ANALYTICS ================= */
  const viewAnalytics = async (employee) => {
    setSelectedEmployee(employee);
    setShowAnalytics(true);
    setLogs([]);
    setEntries([]);

    const logsRes = await fetch(
      `http://localhost:5000/api/users/${employee._id}/activity`
    );
    setLogs(await logsRes.json());

    const entryRes = await fetch(
      `http://localhost:5000/api/users/${employee._id}/entries`
    );
    setEntries(await entryRes.json());
  };

  /* ================= LOGIN LOGS ================= */
  const loginLogs = useMemo(
    () => logs.filter((l) => l.action === "LOGIN"),
    [logs]
  );

  const lastLoginText = loginLogs.length
    ? new Date(loginLogs[0].at).toLocaleString()
    : "Never";

  /* ================= INACTIVE CHECK ================= */
  const isInactive = (u) => {
    if (!u.activityLogs || u.activityLogs.length === 0) return true;

    const lastLogin = u.activityLogs
      .filter((a) => a.action === "LOGIN")
      .sort((a, b) => new Date(b.at) - new Date(a.at))[0];

    if (!lastLogin) return true;

    const diffDays =
      (Date.now() - new Date(lastLogin.at)) / (1000 * 60 * 60 * 24);

    return diffDays > INACTIVE_DAYS;
  };

  /* ================= ACTIVITY GRAPH ================= */
  const activityGraphData = useMemo(() => {
    const map = {};
    logs.forEach((l) => {
      const d = new Date(l.at).toLocaleDateString();
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [logs]);

  /* ================= REVENUE GRAPH ================= */
  const revenueGraphData = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!e.exitTime) return;
      const d = new Date(e.exitTime).toLocaleDateString();
      map[d] = (map[d] || 0) + (e.fee || 0);
    });
    return Object.entries(map).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }, [entries]);

  /* ================= EXPORT EXCEL ================= */
  const exportExcel = () => {
    const data = entries.map((e) => ({
      Vehicle: e.vehicleNumber,
      Entry: new Date(e.entryTime).toLocaleString(),
      Exit: e.exitTime ? new Date(e.exitTime).toLocaleString() : "",
      Amount: e.fee || 0,
      Payment: e.paymentMode,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employee Report");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `${selectedEmployee.email}-report.xlsx`);
  };

  /* ================= FILTER ================= */
  const filteredEmployees = employees.filter(
    (e) =>
      (e.name || "").toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.dashboard}>
      <div className={styles.card}>
        <h1>👷 Admin Employees</h1>

        <input
          className={styles.search}
          placeholder="🔍 Search employee"
          onChange={(e) => setSearch(e.target.value)}
        />

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredEmployees.map((e) => (
              <tr key={e._id}>
                <td>{e.name || "Not Set"}</td>
                <td>{e.email}</td>
                <td>
                  <span
                    className={
                      isInactive(e) ? styles.inactive : styles.active
                    }
                  >
                    {isInactive(e) ? "Inactive" : "Active"}
                  </span>
                </td>
                <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => viewAnalytics(e)}>
                    Analytics
                  </button>
                  <button onClick={() => deleteEmployee(e._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= ANALYTICS MODAL ================= */}
      {showAnalytics && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2>Employee Analytics</h2>
            <p>{selectedEmployee.email}</p>

            <p>
              <b>Total Logins:</b> {loginLogs.length} <br />
              <b>Last Login:</b> {lastLoginText}
            </p>

            <button onClick={exportExcel}>⬇ Export Excel</button>

            <h4>Activity Timeline</h4>
            <ResponsiveContainer height={220}>
              <LineChart data={activityGraphData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line dataKey="count" stroke="#2563eb" />
              </LineChart>
            </ResponsiveContainer>

            <h4>Revenue Handled</h4>
            <ResponsiveContainer height={220}>
              <LineChart data={revenueGraphData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line dataKey="revenue" stroke="#16a34a" />
              </LineChart>
            </ResponsiveContainer>

            <button onClick={() => setShowAnalytics(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployees;