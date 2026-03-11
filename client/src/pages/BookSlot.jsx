import React, { useEffect, useState, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import styles from "../styles/BookSlot.module.css";

const REFRESH_INTERVAL = 5000;

const BookSlot = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [vehicleType, setVehicleType] = useState("Car");
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  /* ================= FETCH SLOTS ================= */
  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/api/slots");
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to fetch slots");
        return;
      }

      setSlots(Array.isArray(data) ? data : []);

      if (selectedSlot) {
        const updated = data.find((s) => s._id === selectedSlot._id);

        if (
          !updated ||
          updated.status !== "locked" ||
          updated.lockedBy?._id !== user?._id
        ) {
          setSelectedSlot(null);
          setLockExpiresAt(null);
        }
      }
    } catch {
      toast.error("Server error while fetching slots");
    }
  }, [selectedSlot, user]);

  useEffect(() => {
    fetchSlots();
    const interval = setInterval(fetchSlots, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchSlots]);

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
          body: JSON.stringify({ userId: user._id }),
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
    } catch {
      toast.error("Lock failed");
    }
  };

  /* ================= RAZORPAY PAYMENT ================= */
  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      toast.error("Select a slot first");
      return;
    }

    if (selectedSlot.lockedBy?._id !== user._id) {
      toast.error("You did not lock this slot");
      return;
    }

    try {
      setLoadingPayment(true);

      const amount = vehicleType === "Car" ? 100 : 50;

      // 1️⃣ Create order
      const orderRes = await fetch(
        "http://localhost:5000/api/payment/create-order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        }
      );

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        toast.error("Failed to create order");
        setLoadingPayment(false);
        return;
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY,
        amount: orderData.amount,
        currency: "INR",
        name: "Vehicle Parking System",
        description: "Parking Slot Booking",
        order_id: orderData.id,

        handler: function () {
          toast.success("Payment Successful ✅");

          navigate("/entry", {
            state: { slotId: selectedSlot._id },
          });
        },

        prefill: {
          name: user.name,
          email: user.email,
        },

        theme: {
          color: "#2b6cb0",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error("Payment failed");
    } finally {
      setLoadingPayment(false);
    }
  };

  /* ================= COUNTDOWN ================= */
  useEffect(() => {
    if (!lockExpiresAt) return;

    const timer = setInterval(() => {
      const diff = lockExpiresAt - Date.now();

      if (diff <= 0) {
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

  /* ================= UI ================= */
  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <h2 className={styles.title}>🚗 Book Parking Slot</h2>

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

        <div className={styles.grid}>
          {slots
            .filter((s) => s.type === vehicleType)
            .map((slot) => {
              const isSelected = selectedSlot?._id === slot._id;
              const isLocked = slot.status !== "available";
              const lockedByMe =
                slot.lockedBy && slot.lockedBy._id === user?._id;
              const lockedByOther =
                slot.lockedBy && slot.lockedBy._id !== user?._id;

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

                  {lockedByMe && lockExpiresAt && (
                    <>
                      <div className={styles.countdown}>
                        ⏳ {getCountdown()}
                      </div>
                      <div className={styles.youLocked}>
                        🔐 You locked this slot
                      </div>
                    </>
                  )}

                  {lockedByOther && (
                    <div className={styles.lockedBy}>
                      🔒 Locked by <b>{slot.lockedBy.name}</b>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <button
          className={styles.bookBtn}
          disabled={!selectedSlot || loadingPayment}
          onClick={handleConfirmBooking}
        >
          {loadingPayment ? "Processing..." : "Pay & Confirm Booking"}
        </button>
      </div>
    </div>
  );
};

export default BookSlot;