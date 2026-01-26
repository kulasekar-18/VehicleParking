import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import styles from "../styles/EmployeeDashboard.module.css";
import AnimatedCounter from "../components/AnimatedCounter";

const REFRESH_INTERVAL = 10000; // 10 sec

const EmployeeDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  /* 🕒 SHIFT STATE */
  const [activeShift, setActiveShift] = useState(null);

  /* 🔥 Typing + Online Status */
  const [typedName, setTypedName] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const typingIndex = useRef(0);

  /* 🔒 refs to avoid duplicate toasts */
  const prevEntryCount = useRef(0);
  const prevExitCount = useRef(0);

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    if (!user) return;

    const [eRes, aRes] = await Promise.all([
      fetch(`http://localhost:5000/api/users/${user._id}/entries`),
      fetch(`http://localhost:5000/api/users/${user._id}/activity`),
    ]);

    const newEntries = await eRes.json();
    const newActivity = await aRes.json();

    if (newEntries.length > prevEntryCount.current) {
      toast.success("🚗 New vehicle entry created");
    }

    const exitsNow = newEntries.filter(
      (e) => e.status === "Exited"
    ).length;

    if (exitsNow > prevExitCount.current) {
      toast("🏁 Vehicle exit completed", { icon: "💰" });
    }

    prevEntryCount.current = newEntries.length;
    prevExitCount.current = exitsNow;

    setEntries(newEntries);
    setActivity(newActivity);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [user]);

  /* ================= TYPING EFFECT ================= */
  useEffect(() => {
    if (!user) return;

    typingIndex.current = 0;
    setTypedName("");

    const interval = setInterval(() => {
      setTypedName((prev) => {
        if (typingIndex.current >= user.name.length) {
          clearInterval(interval);
          return prev;
        }
        const next = prev + user.name[typingIndex.current];
        typingIndex.current += 1;
        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [user]);

  /* ================= ONLINE / OFFLINE ================= */
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /* ================= SHIFT FUNCTIONS ================= */
  const startShift = async () => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/employee/shift/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: user._id }),
        }
      );

      const data = await res.json();
      if (!res.ok) return toast.error(data.message);

      setActiveShift(data.shift);
      toast.success("🟢 Shift started");
    } catch {
      toast.error("Failed to start shift");
    }
  };

  const endShift = async () => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/employee/shift/end",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: user._id }),
        }
      );

      const data = await res.json();
      if (!res.ok) return toast.error(data.message);

      setActiveShift(null);
      toast.success("🔴 Shift ended");
    } catch {
      toast.error("Failed to end shift");
    }
  };

  /* ================= CALCULATIONS ================= */
  const today = new Date().toDateString();

  const todayEntries = useMemo(
    () =>
      entries.filter(
        (e) => new Date(e.entryTime).toDateString() === today
      ),
    [entries, today]
  );

  const todayExits = todayEntries.filter(
    (e) => e.status === "Exited"
  );

  const todayRevenue = todayExits.reduce(
    (sum, e) => sum + (e.fee || 0),
    0
  );

  const chartData = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!e.exitTime) return;
      const d = new Date(e.exitTime).toLocaleDateString();
      map[d] = (map[d] || 0) + (e.fee || 0);
    });
    return Object.entries(map).map(([day, revenue]) => ({
      day,
      revenue,
    }));
  }, [entries]);

  /* ================= ACCESS ================= */
  if (!user) return <h2 className={styles.center}>Please login</h2>;
  if (user.role !== "employee")
    return <h2 className={styles.center}>🚫 Access Denied</h2>;
  if (loading)
    return <h2 className={styles.center}>⏳ Loading dashboard...</h2>;

  /* ================= EXPORT ================= */
  const exportCSV = () => {
    const rows = [
      ["Vehicle", "Entry", "Exit", "Fee", "Status"],
      ...todayEntries.map((e) => [
        e.vehicleNumber,
        e.entryTime,
        e.exitTime || "-",
        e.fee || 0,
        e.status,
      ]),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "employee-daily-report.csv";
    link.click();
  };

  return (
    <div className={styles.page}>
      <div className={styles.dashboard}>
        {/* HEADER */}
        <div className={styles.header}>
          <div>
            <h1>👷 Employee Dashboard</h1>
            <p className={styles.welcome}>
              Welcome back,
              <span className={styles.employeeName}>
                {typedName || user.name}
              </span>
              <span className={isOnline ? styles.online : styles.offline}>
                ● {isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </p>
          </div>

          <div className={styles.liveBadge}>
            <span className={styles.pulse}></span>
            <span className={styles.liveText}>LIVE</span>
          </div>
        </div>

        {/* KPI */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h4>Entries Today</h4>
            <AnimatedCounter value={todayEntries.length} />
          </div>

          <div className={styles.statCard}>
            <h4>Exits Today</h4>
            <AnimatedCounter value={todayExits.length} />
          </div>

          <div className={styles.statCard}>
            <h4>Revenue</h4>
            <AnimatedCounter value={todayRevenue} />
          </div>
        </div>

        {/* SHIFT + ACTIONS */}
        <div className={styles.actions}>
          {!activeShift ? (
            <button onClick={startShift}>▶ Start Shift</button>
          ) : (
            <button onClick={endShift}>⏹ End Shift</button>
          )}

          <button onClick={() => navigate("/entry")}>
            ➕ Create Entry
          </button>
          <button onClick={() => navigate("/exit")}>
            🚪 Process Exit
          </button>
          <button onClick={exportCSV}>⬇ Export CSV</button>
        </div>

        {/* CHART */}
        <div className={styles.card}>
          <h3>📈 Revenue Trend</h3>
          <ResponsiveContainer height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line
                dataKey="revenue"
                stroke="#22c55e"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ACTIVITY */}
        <div className={styles.card}>
          <h3>🕒 Activity Timeline</h3>
          <ul className={styles.timeline}>
            {activity.slice(0, 8).map((a, i) => (
              <li key={i}>
                <b>{a.action}</b>
                <small>{new Date(a.at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;