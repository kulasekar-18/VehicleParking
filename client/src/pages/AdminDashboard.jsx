// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { QRCodeCanvas } from "qrcode.react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import styles from "../styles/Dashboard.module.css";

const COLORS = ["#00C49F", "#FF8042", "#0088FE", "#FFBB28"];
const RAZORPAY_KEY = "rzp_test_xFcwRMAeGVcb11";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* ================= FETCH ================= */
  useEffect(() => {
    fetchEntries();
    fetchUsers();
    fetchActivity();
  }, []);

  const fetchEntries = async () => {
    const res = await fetch("http://localhost:5000/api/admin/entries");
    setEntries(await res.json());
  };

  const fetchUsers = async () => {
    const res = await fetch("http://localhost:5000/api/admin/users");
    setUsers(await res.json());
  };

  const fetchActivity = async () => {
    const res = await fetch("http://localhost:5000/api/admin/activity");
    setActivity(await res.json());
  };

  /* ================= FILTER ================= */
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (!e.exitTime) return false;
      const d = new Date(e.exitTime);
      if (fromDate && d < new Date(fromDate)) return false;
      if (toDate && d > new Date(toDate + "T23:59:59")) return false;
      return true;
    });
  }, [entries, fromDate, toDate]);

  /* ================= STATS ================= */
  const stats = useMemo(() => ({
    active: entries.filter(e => e.status === "Parked").length,
    exited: filteredEntries.length,
    revenue: filteredEntries.reduce((s, e) => s + (e.fee || 0), 0),
  }), [entries, filteredEntries]);

  /* ================= MONTHLY REVENUE ================= */
  const monthlyRevenue = useMemo(() => {
    const map = {};
    filteredEntries.forEach(e => {
      const key = new Date(e.exitTime).toLocaleString("en", {
        month: "short",
        year: "numeric",
      });
      map[key] = (map[key] || 0) + e.fee;
    });
    return Object.entries(map).map(([month, revenue]) => ({ month, revenue }));
  }, [filteredEntries]);

  /* ================= SLOT OCCUPANCY ================= */
  const slotOccupancy = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const slot = e.slotId?.name;
      if (slot) map[slot] = (map[slot] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [entries]);

  /* ================= VEHICLE REVENUE ================= */
  const revenueByVehicle = useMemo(() => {
    const map = {};
    filteredEntries.forEach(e => {
      map[e.vehicleType] = (map[e.vehicleType] || 0) + e.fee;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);
                            

  /* ================= ACTIVITY TIMELINE ================= */
  const activityTimeline = useMemo(() => {
    const map = {};
    activity.forEach(a => {
      const date = new Date(a.at).toLocaleDateString();
      map[date] = (map[date] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [activity]);

  /* ================= USER WISE ACTIVITY ================= */
  const userWiseActivity = useMemo(() => {
    const map = {};
    activity.forEach(a => {
      map[a.email] = (map[a.email] || 0) + 1;
    });
    return Object.entries(map).map(([email, count]) => ({ email, count }));
  }, [activity]);

  /* ================= AUTO WHATSAPP ================= */
  const redirectToWhatsApp = (r) => {
    let phone = r.ownerMobile || "";
    if (!phone.startsWith("+")) phone = "+91" + phone;

    const msg = `
🧾 *Parking Receipt*

Vehicle: ${r.vehicleNumber}
Type: ${r.vehicleType}
Slot: ${r.slotId?.name}
Entry: ${new Date(r.entryTime).toLocaleString()}
Exit: ${new Date(r.exitTime).toLocaleString()}
Amount: ₹${r.fee}
Payment: ${r.paymentMode}

Thank you 🙏
`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  /* ================= EXIT (CASH + RAZORPAY) ================= */
  const handleExit = async (entry) => {
    const mode = window.prompt("Payment mode? (cash / online)");
    if (!mode) return;

    // CASH
    if (mode.toLowerCase() === "cash") {
      const res = await fetch("http://localhost:5000/api/parking/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNumber: entry.vehicleNumber,
          paymentMode: "Cash",
        }),
      });

      const data = await res.json();
      setSelectedReceipt(data.entry);
      redirectToWhatsApp(data.entry);
      fetchEntries();
      fetchActivity();
    }

    // ONLINE (RAZORPAY)
    if (mode.toLowerCase() === "online") {
      new window.Razorpay({
        key: RAZORPAY_KEY,
        amount: (entry.fee || 100) * 100,
        currency: "INR",
        name: "ParkMate",
        handler: async () => {
          const res = await fetch("http://localhost:5000/api/parking/exit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vehicleNumber: entry.vehicleNumber,
              paymentMode: "Online",
            }),
          });

          const data = await res.json();
          setSelectedReceipt(data.entry);
          redirectToWhatsApp(data.entry);
          fetchEntries();
          fetchActivity();
        },
      }).open();
    }
  };

  /* ================= EXPORTS ================= */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEntries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    saveAs(
      new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      "Parking_Report.xlsx"
    );
  };

  const exportPDF = () => {
    const pdf = new jsPDF();
    pdf.text(`Total Revenue: ₹${stats.revenue}`, 20, 20);
    pdf.save("Parking_Report.pdf");
  };

  /* ================= UI ================= */
  return (
    <div className={styles.dashboard}>
      <h1>🛠 Admin Dashboard</h1>

      <div className={styles.filterRow}>
        <button onClick={() => navigate("/entry")}>➕ Entry</button>
        <button onClick={() => navigate("/admin/users")}>👥 Users</button>
        <button onClick={exportExcel}>⬇ Excel</button>
        <button onClick={exportPDF}>📄 PDF</button>
      </div>

      <div className={styles.filterRow}>
        <input type="date" onChange={e => setFromDate(e.target.value)} />
        <input type="date" onChange={e => setToDate(e.target.value)} />
      </div>

      <div className={styles.statsGrid}>
        <div>Active: {stats.active}</div>
        <div>Exited: {stats.exited}</div>
        <div>Revenue: ₹{stats.revenue}</div>
        <div>Users: {users.length}</div>
      </div>

      {/* CHARTS */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Monthly Revenue</h3>
          <ResponsiveContainer height={250}>
            <LineChart data={monthlyRevenue}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line dataKey="revenue" stroke="#00C49F" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card}>
          <h3>Slot Occupancy</h3>
          <ResponsiveContainer height={250}>
            <BarChart data={slotOccupancy}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card}>
          <h3>Vehicle Revenue</h3>
          <ResponsiveContainer height={250}>
            <PieChart>
              <Pie data={revenueByVehicle} dataKey="value" nameKey="name">
                {revenueByVehicle.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* USER-WISE ACTIVITY */}
<div className={styles.card}>
  <h3>User-wise Activity</h3>
  <ResponsiveContainer height={180}>
    <BarChart data={userWiseActivity}>
      <XAxis dataKey="email" hide />
      <YAxis />
      <Tooltip />
      <Bar dataKey="count" fill="#FF8042" />
    </BarChart>
  </ResponsiveContainer>
</div>

{/* ACTIVITY TIMELINE */}
<div className={styles.card}>
  <h3>Activity Timeline</h3>
  <ResponsiveContainer height={250}>
    <LineChart data={activityTimeline}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line dataKey="count" stroke="#FFBB28" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
</div>

      {/* TABLE */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Slot</th>
            <th>Status</th>
            <th>Fee</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e._id}>
              <td>{e.vehicleNumber}</td>
              <td>{e.slotId?.name}</td>
              <td>{e.status}</td>
              <td>₹{e.fee || 0}</td>
              <td>
                {e.status === "Parked" ? (
                  <button onClick={() => handleExit(e)}>Exit</button>
                ) : (
                  <button onClick={() => setSelectedReceipt(e)}>
                    View Receipt
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* RECEIPT */}
      {selectedReceipt && (
        <div style={{ position: "fixed", inset: 0, background: "#0008" }}>
          <div
            style={{
              width: 300,
              background: "#fff",
              padding: 16,
              margin: "10% auto",
              fontFamily: "monospace",
            }}
          >
            <h3>🎫 Parking Receipt</h3>
            <p>Vehicle: {selectedReceipt.vehicleNumber}</p>
            <p>Slot: {selectedReceipt.slotId?.name}</p>
            <p>Amount: ₹{selectedReceipt.fee}</p>
            <QRCodeCanvas value={selectedReceipt.vehicleNumber} size={120} />
            <button onClick={() => setSelectedReceipt(null)}>❌ Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;