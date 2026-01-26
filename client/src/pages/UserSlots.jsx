// src/pages/UserSlots.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./UserSlots.css";

const UserSlots = () => {
  const [slots, setSlots] = useState([]);
  const [filteredSlots, setFilteredSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("name");

  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [bookingSlotId, setBookingSlotId] = useState(null);

  const navigate = useNavigate();
  const slotsPerPage = 8;

  /* ================= FETCH SLOTS ================= */
  const fetchSlots = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/slots");
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to fetch slots");
      } else {
        setSlots(data);
        setFilteredSlots(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error(err);
      setError("Server error while loading slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    const interval = setInterval(fetchSlots, 30000); // 🔄 real-time refresh
    return () => clearInterval(interval);
  }, []);

  /* ================= FILTER + SORT ================= */
  useEffect(() => {
    let updated = [...slots];

    if (search) {
      updated = updated.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filterType !== "All") {
      updated = updated.filter((s) => s.type === filterType);
    }

    if (filterStatus !== "All") {
      updated = updated.filter((s) => s.status === filterStatus);
    }

    if (sortBy === "name") updated.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "status")
      updated.sort((a, b) => a.status.localeCompare(b.status));
    if (sortBy === "type") updated.sort((a, b) => a.type.localeCompare(b.type));

    setFilteredSlots(updated);
    setCurrentPage(1);
  }, [search, filterType, filterStatus, sortBy, slots]);

  /* ================= PAGINATION ================= */
  const indexOfLast = currentPage * slotsPerPage;
  const indexOfFirst = indexOfLast - slotsPerPage;
  const currentSlots = filteredSlots.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredSlots.length / slotsPerPage);

  /* ================= LOCK SLOT ================= */
  const lockSlotAndProceed = async (slotId) => {
  try {
    setBookingSlotId(slotId);

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?._id) {
      alert("Please login again");
      setBookingSlotId(null);
      return;
    }

    const res = await fetch(
      `http://localhost:5000/api/slots/${slotId}/lock`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Slot already locked");
      setBookingSlotId(null);
      return;
    }

    navigate("/entry", { state: { slotId } });
  } catch (err) {
    console.error(err);
    alert("Failed to lock slot");
    setBookingSlotId(null);
  }
};

  if (loading) return <p className="loading">⏳ Loading parking slots...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="user-slots-container">
      <h2 className="title">🅿 Parking Slots</h2>

      {lastUpdated && (
        <p className="last-updated">
          🔄 Updated at {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* FILTERS */}
      <div className="filters">
        <input
          placeholder="🔍 Search slot..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="All">All Types</option>
          <option value="Car">Car</option>
          <option value="Bike">Bike</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="available">Available</option>
          <option value="locked">Locked</option>
          <option value="booked">Booked</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort: Name</option>
          <option value="status">Sort: Status</option>
          <option value="type">Sort: Type</option>
        </select>
      </div>

      {/* SLOT GRID */}
      {currentSlots.length === 0 ? (
        <p className="no-slots">No slots found</p>
      ) : (
        <div className="slots-grid">
          {currentSlots.map((slot) => (
            <div key={slot._id} className={`slot-card ${slot.status}`}>
              <h3>{slot.name}</h3>
              <p><strong>Type:</strong> {slot.type}</p>

              <p>
                <strong>Status:</strong>{" "}
                <span className={`status-badge ${slot.status}`}>
                  {slot.status.toUpperCase()}
                </span>
              </p>

              {slot.status === "available" ? (
                <button
                  className="book-btn"
                  disabled={bookingSlotId === slot._id}
                  onClick={() => lockSlotAndProceed(slot._id)}
                >
                  {bookingSlotId === slot._id ? "Locking..." : "🚗 Book Slot"}
                </button>
              ) : slot.status === "locked" ? (
                <p className="booked-by">⏳ Temporarily Locked</p>
              ) : (
                <p className="booked-by">🔒 Booked</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            ⬅ Prev
          </button>

          <span>
            Page {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next ➡
          </button>
        </div>
      )}
    </div>
  );
};

export default UserSlots;