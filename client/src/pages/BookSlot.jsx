import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import styles from "../styles/BookSlot.module.css";

const REFRESH_INTERVAL = 5000;

const BookSlot = () => {
  const { user } = useContext(AuthContext);

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [vehicleType, setVehicleType] = useState("Car");
  const [lockExpiresAt, setLockExpiresAt] = useState(null);

  /* ================= FETCH SLOTS ================= */
  useEffect(() => {
    fetchSlots();
    const i = setInterval(fetchSlots, REFRESH_INTERVAL);
    return () => clearInterval(i);
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/slots");
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to fetch slots");
    }
  };

  /* ================= LOCK SLOT ================= */
  const lockSlot = async (slot) => {
  if (!user) {
    toast.error("Login required");
    return;
  }

  try {
    const res = await fetch(
      `http://localhost:5000/api/slots/${slot._id}/lock`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || "Slot already locked");
      return;
    }

    setSelectedSlot(slot);
    setLockExpiresAt(new Date(data.lockExpiresAt).getTime());
    toast.success(`🅿️ Slot ${slot.name} locked`);
  } catch (err) {
    toast.error("Lock failed");
  }
};

  /* ================= COUNTDOWN ================= */
  useEffect(() => {
    if (!lockExpiresAt) return;

    const timer = setInterval(() => {
      if (Date.now() >= lockExpiresAt) {
        setSelectedSlot(null);
        setLockExpiresAt(null);
        toast.error("⏱ Slot lock expired");
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockExpiresAt]);

  const getCountdown = () => {
    if (!lockExpiresAt) return null;
    const diff = lockExpiresAt - Date.now();
    if (diff <= 0) return "0:00";
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <h2 className={styles.title}>🚗 Book Parking Slot</h2>

        {/* VEHICLE TYPE */}
        <div className={styles.field}>
          <label>Vehicle Type</label>
          <select
            value={vehicleType}
            onChange={(e) => {
              setVehicleType(e.target.value);
              setSelectedSlot(null);
              setLockExpiresAt(null);
            }}
          >
            <option value="Car">Car</option>
            <option value="Bike">Bike</option>
          </select>
        </div>

        {/* SLOT GRID */}
        <div className={styles.grid}>
          {slots
            .filter((s) => s.type === vehicleType)
            .map((slot) => {
              const isSelected = selectedSlot?._id === slot._id;
              const isLocked = slot.status !== "available";
              const lockedByMe =
                slot.lockedBy &&
                slot.lockedBy._id === user?._id;
              const lockedByOther =
                slot.lockedBy &&
                slot.lockedBy._id !== user?._id;

              return (
                <div
                  key={slot._id}
                  className={`${styles.slot}
                    ${isLocked ? styles.locked : ""}
                    ${lockedByMe ? styles.lockedByMe : ""}
                    ${isSelected ? styles.selected : ""}
                  `}
                  onClick={() => {
                    if (!isLocked) lockSlot(slot);
                  }}
                >
                  <div className={styles.slotName}>{slot.name}</div>

                  {/* ⏳ COUNTDOWN (ONLY FOR YOU) */}
                  {lockedByMe && lockExpiresAt && (
                    <div className={styles.countdown}>
                      ⏳ {getCountdown()}
                    </div>
                  )}

                  {/* 🔐 YOU LOCKED THIS */}
                  {lockedByMe && (
                    <div className={styles.youLocked}>
                      🔐 You locked this slot
                    </div>
                  )}

                  {/* 🔒 LOCKED BY OTHER */}
                  {lockedByOther && (
                    <div className={styles.lockedBy}>
                      🔒 Locked by{" "}
                      <b>{slot.lockedBy.name}</b>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <button
          className={styles.bookBtn}
          disabled={!selectedSlot}
        >
          Confirm Booking
        </button>
      </div>
    </div>
  );
};

export default BookSlot;