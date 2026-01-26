import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "../styles/Dashboard.module.css";

// 🎨 Color palette for vehicles
const COLORS = ["#00C49F", "#FF8042", "#0088FE", "#FFBB28", "#AA66CC", "#FF4444"];

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [animatedStats, setAnimatedStats] = useState({});
  const [limit, setLimit] = useState(5);
  const [search, setSearch] = useState("");

  const [dateRange, setDateRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/bookings");
        const data = await res.json();
        setBookings(data);
      } catch (err) {
        console.error("Error fetching bookings:", err);
      }
    };
    fetchBookings();
  }, []);

  // Apply Date Range Filter + Stats
  useEffect(() => {
    let filtered = [...bookings];
    const now = new Date();

    if (dateRange === "today") {
      filtered = filtered.filter(
        (b) => new Date(b.entryTime).toDateString() === now.toDateString()
      );
    } else if (dateRange === "week") {
      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - now.getDay());
      filtered = filtered.filter((b) => new Date(b.entryTime) >= startOfWeek);
    } else if (dateRange === "month") {
      const month = now.getMonth();
      const year = now.getFullYear();
      filtered = filtered.filter((b) => {
        const d = new Date(b.entryTime);
        return d.getMonth() === month && d.getFullYear() === year;
      });
    } else if (dateRange === "custom" && customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      filtered = filtered.filter((b) => {
        const d = new Date(b.entryTime);
        return d >= from && d <= to;
      });
    }

    setFilteredBookings(filtered);

    // Stats
    const totalSlots = 120;
    const active = filtered.filter((b) => b.status === "active").length;
    const exited = filtered.filter((b) => b.status === "completed").length;
    const revenue = filtered.reduce((sum, b) => sum + (b.charges || 0), 0);

    const durations = filtered
      .filter((b) => b.exitTime && b.entryTime)
      .map((b) =>
        Math.ceil(
          (new Date(b.exitTime) - new Date(b.entryTime)) / (1000 * 60 * 60)
        )
      );
    const avgDuration =
      durations.length > 0
        ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
        : 0;

    setStats({
      totalSlots,
      active,
      exited,
      revenue,
      avgDuration,
    });
  }, [bookings, dateRange, customFrom, customTo]);

  // Animate counters
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedStats((prev) => {
        const updated = { ...prev };
        Object.keys(stats).forEach((key) => {
          if (typeof stats[key] === "number") {
            if (!prev[key]) prev[key] = 0;
            if (prev[key] < stats[key]) {
              updated[key] = Math.min(
                prev[key] + Math.ceil(stats[key] / 20),
                stats[key]
              );
            }
          }
        });
        return updated;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [stats]);

  // Booking trend (rolling 7 days from today)
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayIndex = new Date().getDay();
  const orderedWeekdays = [
    ...weekdays.slice(todayIndex),
    ...weekdays.slice(0, todayIndex),
  ];

  const bookingTrendRaw = filteredBookings.reduce((acc, b) => {
    const day = new Date(b.entryTime).toLocaleDateString("en-US", {
      weekday: "short",
    });
    const existing = acc.find((item) => item.day === day);
    if (existing) existing.bookings += 1;
    else acc.push({ day, bookings: 1 });
    return acc;
  }, []);

  const bookingTrend = orderedWeekdays.map((d) => {
    const found = bookingTrendRaw.find((item) => item.day === d);
    return { day: d, bookings: found ? found.bookings : 0 };
  });

  // Revenue trend
  const revenueTrendRaw = filteredBookings.reduce((acc, b) => {
    if (b.status === "completed" && b.exitTime) {
      const day = new Date(b.exitTime).toLocaleDateString("en-US", {
        weekday: "short",
      });
      const existing = acc.find((item) => item.day === day);
      if (existing) existing.revenue += b.charges || 0;
      else acc.push({ day, revenue: b.charges || 0 });
    }
    return acc;
  }, []);

  const revenueTrend = orderedWeekdays.map((d) => {
    const found = revenueTrendRaw.find((item) => item.day === d);
    return { day: d, revenue: found ? found.revenue : 0 };
  });

  // ✅ Vehicle Type Distribution (Dynamic)
  const vehicleTypeCounts = filteredBookings.reduce((acc, b) => {
    const type = b.slot?.type || "Unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const vehicleData = Object.entries(vehicleTypeCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // Occupancy %
  const occupancyPercent = Math.round(
    (stats.active / stats.totalSlots) * 100
  );

  // Peak Hours
  const peakHours = filteredBookings.reduce((acc, b) => {
    if (b.entryTime) {
      const hour = new Date(b.entryTime).getHours();
      const existing = acc.find((item) => item.hour === hour);
      if (existing) existing.count += 1;
      else acc.push({ hour, count: 1 });
    }
    return acc;
  }, []);
  peakHours.sort((a, b) => a.hour - b.hour);

  // Search + Limit
  const searchedBookings = filteredBookings.filter((b) =>
    b.vehicleNumber?.toLowerCase().includes(search.toLowerCase())
  );
  const recentBookings =
    limit === "all" ? searchedBookings : searchedBookings.slice(-limit);

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

    doc.setFontSize(16);
    doc.text("Recent Bookings Report", 40, 40);

    const tableColumn = ["Vehicle", "Slot", "Status", "Charges"];
    const tableRows = recentBookings.map((b) => [
      b.vehicleNumber || "",
      b.slot?.name || "N/A",
      b.status || "",
      `₹${b.charges || 0}`,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 40, right: 40 },
    });

    doc.save("bookings_report.pdf");
  };

  // ✅ Export CSV
  const exportCSV = () => {
    const csvRows = [
      ["Vehicle", "Slot", "Status", "Charges"],
      ...recentBookings.map((b) => [
        b.vehicleNumber,
        b.slot?.name || "N/A",
        b.status,
        "₹" + (b.charges || 0),
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvRows.map((row) => row.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "bookings_report.csv");
    link.click();
  };

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>
        Welcome back, {user?.username || "User"} 👋
      </h1>
      <p className={styles.subtitle}>
        Here's a quick overview of your parking system.
      </p>

      {/* Date Range Filter */}
      <div style={{ marginBottom: "15px", display: "flex", gap: "10px" }}>
        <label style={{ fontWeight: "bold" }}>Filter by:</label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          style={{ padding: "6px", borderRadius: "6px" }}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>

        {dateRange === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </>
        )}
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.card}>
          <p>Total Slots</p>
          <h2>{animatedStats.totalSlots}</h2>
        </div>
        <div className={styles.card}>
          <p>Active (Entry)</p>
          <h2>{animatedStats.active}</h2>
        </div>
        <div className={styles.card}>
          <p>Exited</p>
          <h2>{animatedStats.exited}</h2>
        </div>
        <div className={styles.card}>
          <p>Revenue</p>
          <h2>₹{animatedStats.revenue}</h2>
        </div>
        <div className={styles.card}>
          <p>Avg. Duration</p>
          <h2>{animatedStats.avgDuration} hrs</h2>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.grid}>
        {/* Booking Trend */}
        <div className={styles.card}>
          <h2>📈 Booking Trends</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={bookingTrend}>
              <CartesianGrid stroke="#555" strokeDasharray="5 5" />
              <XAxis dataKey="day" stroke="#ddd" />
              <YAxis stroke="#ddd" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="#00d4ff"
                strokeWidth={3}
                dot={{ r: 5, fill: "#00d4ff", stroke: "#0088cc", strokeWidth: 2 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className={styles.card}>
          <h2>💰 Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueTrend}>
              <CartesianGrid stroke="#555" strokeDasharray="5 5" />
              <XAxis dataKey="day" stroke="#ddd" />
              <YAxis stroke="#ddd" />
              <Tooltip />
              <Bar dataKey="revenue" fill="#00ff88" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle Type Pie */}
        <div className={styles.card}>
          <h2>🚗 Vehicle Type Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={vehicleData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent, value }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {vehicleData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} Vehicles`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy */}
        <div className={styles.card}>
          <h2>📊 Occupancy</h2>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${occupancyPercent}%` }}
            >
              {occupancyPercent}%
            </div>
          </div>
          <p>
            {stats.active} of {stats.totalSlots} slots occupied
          </p>
        </div>

        {/* Peak Hours */}
        <div className={styles.card}>
          <h2>⏰ Peak Hours</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={peakHours}>
              <CartesianGrid stroke="#555" strokeDasharray="5 5" />
              <XAxis
                dataKey="hour"
                stroke="#ddd"
                tickFormatter={(h) => `${h}:00`}
              />
              <YAxis stroke="#ddd" />
              <Tooltip formatter={(val) => `${val} vehicles`} />
              <Bar dataKey="count" fill="#8884d8" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className={styles.card}>
          <h2>⚡ Quick Actions</h2>
          <Link to="/add-slot" className={styles.actionBtn}>
            ➕ Add Slot
          </Link>
          <Link to="/slots" className={styles.actionBtn}>
            📌 View Slots
          </Link>
          <Link to="/entry" className={styles.actionBtn}>
            🚗 Vehicle Entry
          </Link>
          <Link to="/exit" className={styles.actionBtn}>
            🚪 Vehicle Exit
          </Link>
          <Link to="/profile" className={styles.actionBtn}>
            👤 My Profile
          </Link>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className={styles.card}>
        <h2>📋 Recent Bookings</h2>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <input
            type="text"
            placeholder="Search by vehicle number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              flex: 1,
              marginRight: "10px",
            }}
          />

          <select
            value={limit}
            onChange={(e) =>
              setLimit(e.target.value === "all" ? "all" : parseInt(e.target.value))
            }
          >
            <option value={5}>Last 5</option>
            <option value={10}>Last 10</option>
            <option value="all">All</option>
          </select>

          <button onClick={exportPDF} className={styles.actionBtn}>
            📄 Export PDF
          </button>
          <button onClick={exportCSV} className={styles.actionBtn}>
            📊 Export CSV
          </button>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Slot</th>
              <th>Status</th>
              <th>Charges</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((b) => (
              <tr key={b._id}>
                <td>{b.vehicleNumber}</td>
                <td>{b.slot?.name || "N/A"}</td>
                <td>
                  <span
                    className={`${styles.status} ${styles[b.status.toLowerCase()]}`}
                  >
                    {b.status}
                  </span>
                </td>
                <td>₹{b.charges || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;