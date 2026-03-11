import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import styles from "../styles/Entry.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Entry = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const preselectedSlotId = location.state?.slotId || "";

  const [ownerName, setOwnerName] = useState("");
  const [ownerMobile, setOwnerMobile] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(preselectedSlotId);

  const [ticket, setTicket] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);

  const ticketRef = useRef(null);

  /* ================= FETCH ACTIVE BOOKING ================= */
  useEffect(() => {
    if (!user) return;

    const fetchActiveBooking = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/bookings/by-user/${user._id}`
        );

        const active = res.data.find((b) => b.status === "active");

        if (active) {
          setActiveBooking(active);

          // 🔥 Auto-fill form
          setOwnerName(active.ownerName);
          setOwnerMobile(active.ownerMobile);
          setVehicleNumber(active.vehicleNumber);
          setVehicleType(active.vehicleType);
          setSelectedSlot(active.slot._id);

          toast.info("🔒 Active booking loaded");
        }
      } catch {
        console.log("No active booking");
      }
    };

    fetchActiveBooking();
  }, [user]);

  /* ================= FETCH AVAILABLE SLOTS ================= */
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/slots",
          {
            params: { type: vehicleType },
          }
        );
        setSlots(res.data);
      } catch {
        toast.error("Failed to load slots");
      }
    };

    fetchSlots();
  }, [vehicleType]);

  /* ================= WHATSAPP ================= */
  const redirectToWhatsApp = ({
    ownerName,
    ownerMobile,
    vehicleNumber,
    vehicleType,
    slotName,
  }) => {
    let phone = ownerMobile.trim();
    if (!phone.startsWith("+")) phone = `+91${phone}`;

    const message = `🚗 *Vehicle Entry Confirmed*

👤 Owner: ${ownerName}
🚘 Vehicle: ${vehicleNumber} (${vehicleType})
🅿 Slot: ${slotName}
⏰ Entry Time: ${new Date().toLocaleString()}

Thank you for using our Parking Service 🙏`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) return toast.error("Please login again");

    if (ownerMobile.length !== 10)
      return toast.error("Enter valid 10-digit mobile number");

    if (!selectedSlot)
      return toast.error("Please select a slot");

    const slotObj = slots.find((s) => s._id === selectedSlot);

    if (!slotObj)
      return toast.error("Invalid slot selected");

    const entryData = {
      userId: user._id,
      ownerName: ownerName.trim(),
      ownerMobile: ownerMobile.trim(),
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      vehicleType,
      slotId: slotObj._id,
    };

    try {
      await axios.post(
        "http://localhost:5000/api/parking/entry",
        entryData
      );

      toast.success("✅ Vehicle entry successful");

      setTicket({
        ownerName: entryData.ownerName,
        vehicleNumber: entryData.vehicleNumber,
        vehicleType: entryData.vehicleType,
        slotName: slotObj.name,
        entryTime: new Date().toLocaleString(),
      });

      redirectToWhatsApp({
        ...entryData,
        slotName: slotObj.name,
      });

      // ✅ Clear active booking after entry
      setActiveBooking(null);

      setOwnerName("");
      setOwnerMobile("");
      setVehicleNumber("");
      setSelectedSlot("");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Entry failed"
      );
    }
  };

  /* ================= PRINT ================= */
  const handlePrint = () => {
    window.print();
  };

  /* ================= PDF DOWNLOAD ================= */
  const handleDownloadPDF = async () => {
    const canvas = await html2canvas(ticketRef.current, {
      scale: 2,
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = 190;
    const imgHeight =
      (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(
      imgData,
      "PNG",
      10,
      10,
      pdfWidth,
      imgHeight
    );
    pdf.save("parking-ticket.pdf");
  };

  return (
    <div className={styles.entryPage}>
      <div className={styles.card}>
        <h2 className={styles.header}>
          🚗 Vehicle Entry
        </h2>

        {/* 🔒 ACTIVE BOOKING INFO */}
        {activeBooking && (
          <div className={styles.bookingInfo}>
            🔒 Active Booking Found for Slot:{" "}
            <b>{activeBooking.slot.name}</b>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={styles.form}
        >
          <input
            placeholder="Owner Name"
            value={ownerName}
            onChange={(e) =>
              setOwnerName(e.target.value)
            }
            required
          />

          <input
            placeholder="Mobile Number"
            value={ownerMobile}
            onChange={(e) =>
              setOwnerMobile(e.target.value)
            }
            maxLength={10}
            required
          />

          <input
            placeholder="Vehicle Number"
            value={vehicleNumber}
            onChange={(e) =>
              setVehicleNumber(e.target.value)
            }
            required
          />

          <select
            value={vehicleType}
            onChange={(e) =>
              setVehicleType(e.target.value)
            }
          >
            <option value="Car">🚗 Car</option>
            <option value="Bike">🏍 Bike</option>
          </select>

          <select
            value={selectedSlot}
            onChange={(e) =>
              setSelectedSlot(e.target.value)
            }
            required
          >
            <option value="">📍 Select Slot</option>
            {slots.map((s) => (
              <option
                key={s._id}
                value={s._id}
              >
                {s.name} ({s.type})
              </option>
            ))}
          </select>

          <button type="submit">
            Confirm Entry
          </button>
        </form>

        {/* ================= TICKET ================= */}
        {ticket && (
          <>
            <div
              className={styles.ticket}
              ref={ticketRef}
            >
              <h3
                className={styles.ticketTitle}
              >
                🎟 Parking Ticket
              </h3>

              <p>
                <strong>Owner:</strong>{" "}
                {ticket.ownerName}
              </p>
              <p>
                <strong>Vehicle:</strong>{" "}
                {ticket.vehicleNumber} (
                {ticket.vehicleType})
              </p>
              <p>
                <strong>Slot:</strong>{" "}
                {ticket.slotName}
              </p>
              <p>
                <strong>Entry:</strong>{" "}
                {ticket.entryTime}
              </p>

              <div
                className={styles.qrBox}
              >
                <QRCodeCanvas
                  value={`VEHICLE:${ticket.vehicleNumber}|SLOT:${ticket.slotName}|TIME:${ticket.entryTime}`}
                  size={120}
                />
              </div>

              <p
                className={
                  styles.ticketFooter
                }
              >
                Please keep this ticket safe 🚗
              </p>
            </div>

            <div
              className={
                styles.ticketActions
              }
            >
              <button onClick={handlePrint}>
                🖨 Print
              </button>
              <button
                onClick={
                  handleDownloadPDF
                }
              >
                📄 Download PDF
              </button>
            </div>
          </>
        )}
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
      />
    </div>
  );
};

export default Entry;