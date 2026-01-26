import React, { useState, useRef } from "react";
import axios from "axios";
import styles from "../styles/Exit.module.css";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Exit = () => {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  const receiptRef = useRef(null);

  /* ================= EXIT ================= */
  const handleExit = async () => {
    if (!vehicleNumber) {
      return toast.error("Enter vehicle number");
    }

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/api/parking/exit",
        {
          vehicleNumber: vehicleNumber.toUpperCase().trim(),
          paymentMode,
        }
      );

      const exitEntry = res.data.entry;
      setReceipt(exitEntry);

      toast.success("✅ Exit successful");

      // ✅ AUTO WHATSAPP REDIRECT (SAFE + GUARANTEED)
      setTimeout(() => {
        redirectToWhatsApp(exitEntry);
      }, 800);

    } catch (err) {
      toast.error(err.response?.data?.message || "Exit failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= WHATSAPP ================= */
  const redirectToWhatsApp = (r) => {
    if (!r || !r.ownerMobile) return;

    let phone = r.ownerMobile.trim();
    if (!phone.startsWith("+")) phone = "+91" + phone;

    const message = `🚗 *Parking Exit Receipt*

👤 Owner: ${r.ownerName}
🚘 Vehicle: ${r.vehicleNumber} (${r.vehicleType})
🅿 Slot: ${r.slotId?.name || "-"}

⏰ Entry: ${new Date(r.entryTime).toLocaleString()}
🏁 Exit: ${new Date(r.exitTime).toLocaleString()}
⏳ Duration: ${r.durationMinutes} mins
💰 Paid: ₹${r.fee}
💳 Payment: ${r.paymentMode}

Thank you for parking with us 🙏`;

    // ✅ NOT BLOCKED BY BROWSER
    window.location.href =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  /* ================= PRINT ================= */
  const handlePrint = () => {
    window.print();
  };

  /* ================= PDF ================= */
  const handleDownloadPDF = async () => {
    const canvas = await html2canvas(receiptRef.current);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(imgData, "PNG", 20, 20, 170, 0);
    pdf.save(`Exit_${receipt.vehicleNumber}.pdf`);
  };

  return (
    <div className={styles.exitPage}>
      <div className={styles.card}>
        <h2 className={styles.header}>🚗 Vehicle Exit</h2>

        {!receipt && (
          <>
            <input
              placeholder="Vehicle Number"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
            />

            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="Cash">💵 Cash</option>
              <option value="Online">💳 Online</option>
            </select>

            <button onClick={handleExit} disabled={loading}>
              {loading ? "Processing..." : "Confirm Exit"}
            </button>
          </>
        )}

        {/* ================= EXIT RECEIPT ================= */}
        {receipt && (
          <>
            <div className={styles.receipt} ref={receiptRef}>
              <h3>🎟 Exit Receipt</h3>

              <div className={styles.row}>
                <span>Owner</span>
                <strong>{receipt.ownerName}</strong>
              </div>

              <div className={styles.row}>
                <span>Vehicle</span>
                <strong>
                  {receipt.vehicleNumber} ({receipt.vehicleType})
                </strong>
              </div>

              <div className={styles.row}>
                <span>Slot</span>
                <strong>{receipt.slotId?.name}</strong>
              </div>

              <div className={styles.row}>
                <span>Entry</span>
                <strong>
                  {new Date(receipt.entryTime).toLocaleString()}
                </strong>
              </div>

              <div className={styles.row}>
                <span>Exit</span>
                <strong>
                  {new Date(receipt.exitTime).toLocaleString()}
                </strong>
              </div>

              <div className={styles.row}>
                <span>Duration</span>
                <strong>{receipt.durationMinutes} mins</strong>
              </div>

              <div className={styles.row}>
                <span>Amount</span>
                <strong>₹{receipt.fee}</strong>
              </div>

              <div className={styles.row}>
                <span>Payment</span>
                <strong>{receipt.paymentMode}</strong>
              </div>

              <div className={styles.qr}>
                <QRCodeCanvas
                  value={`${receipt.vehicleNumber}-${receipt.exitTime}`}
                  size={120}
                />
              </div>

              <p className={styles.footer}>
                Thank you for parking with us 🚗
              </p>
            </div>

            <div className={styles.actions}>
              <button onClick={handlePrint}>🖨 Print</button>
              <button onClick={handleDownloadPDF}>📄 Download PDF</button>
            </div>
          </>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Exit;