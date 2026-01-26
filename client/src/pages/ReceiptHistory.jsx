// frontend/src/pages/ReceiptHistory.jsx
import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import styles from "../styles/Dashboard.module.css";
import receiptStyles from "../styles/Receipt.module.css";

const ReceiptHistory = () => {
  const [receipts, setReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("dateDesc");

  /* ================= FETCH ================= */
  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    const res = await fetch("http://localhost:5000/api/admin/entries");
    const data = await res.json();
    setReceipts(data.filter(r => r.exitTime));
  };

  /* ================= FILTER + SORT ================= */
  const filteredReceipts = useMemo(() => {
    let data = receipts.filter(r => {
      if (
        search &&
        !r.vehicleNumber.toLowerCase().includes(search.toLowerCase())
      )
        return false;

      const d = new Date(r.exitTime);
      if (fromDate && d < new Date(fromDate)) return false;
      if (toDate && d > new Date(toDate + "T23:59:59")) return false;

      return true;
    });

    if (sortBy === "dateAsc")
      data.sort((a, b) => new Date(a.exitTime) - new Date(b.exitTime));
    if (sortBy === "dateDesc")
      data.sort((a, b) => new Date(b.exitTime) - new Date(a.exitTime));
    if (sortBy === "amountAsc") data.sort((a, b) => a.fee - b.fee);
    if (sortBy === "amountDesc") data.sort((a, b) => b.fee - a.fee);

    return data;
  }, [receipts, search, fromDate, toDate, sortBy]);

  /* ================= SUMMARY ================= */
  const summary = useMemo(() => {
    const todayStr = new Date().toLocaleDateString();
    const now = new Date();

    let todayRevenue = 0;
    let monthRevenue = 0;

    filteredReceipts.forEach(r => {
      const d = new Date(r.exitTime);
      if (d.toLocaleDateString() === todayStr)
        todayRevenue += r.fee || 0;

      if (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      )
        monthRevenue += r.fee || 0;
    });

    return {
      total: filteredReceipts.length,
      todayRevenue,
      monthRevenue,
    };
  }, [filteredReceipts]);

  /* ================= EXPORT CSV ================= */
  const exportCSV = () => {
    const data = filteredReceipts.map(r => ({
      Vehicle: r.vehicleNumber,
      Slot: r.slotId?.name,
      Amount: r.fee,
      Payment: r.paymentMode,
      Exit: new Date(r.exitTime).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Receipts");

    saveAs(
      new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      "Receipt_History.xlsx"
    );
  };

  /* ================= EXPORT PDF ================= */
  const exportPDF = () => {
    const pdf = new jsPDF();
    pdf.text("Receipt History", 20, 20);

    filteredReceipts.forEach((r, i) => {
      pdf.text(
        `${i + 1}. ${r.vehicleNumber} | ₹${r.fee} | ${r.paymentMode}`,
        20,
        30 + i * 8
      );
    });

    pdf.save("Receipt_History.pdf");
  };

  /* ================= DELETE ================= */
  const deleteReceipt = async (id) => {
    if (!window.confirm("Refund / delete this receipt?")) return;
    await fetch(`http://localhost:5000/api/admin/receipt/${id}`, {
      method: "DELETE",
    });
    fetchReceipts();
    setSelectedReceipt(null);
  };

  /* ================= WHATSAPP ================= */
  const sendWhatsApp = async (r) => {
    const node = document.getElementById("receipt-ticket");
    if (!node) return;

    const dataUrl = await toPng(node);
    window.open("", "").document.write(`<img src="${dataUrl}" width="300"/>`);

    let phone = r.ownerMobile || "";
    if (!phone.startsWith("+")) phone = "+91" + phone;

    const msg = `
🧾 ParkMate Receipt
Vehicle: ${r.vehicleNumber}
Amount: ₹${r.fee}
Payment: ${r.paymentMode}
`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  return (
    <div className={styles.dashboard}>
      <h1>🧾 Receipt History</h1>

      {/* SUMMARY */}
      <div className={styles.statsGrid}>
        <div>Total Receipts: {summary.total}</div>
        <div>Today Revenue: ₹{summary.todayRevenue}</div>
        <div>This Month: ₹{summary.monthRevenue}</div>
      </div>

      {/* FILTER BAR */}
      <div className={styles.filterRow}>
        <input
          placeholder="Search vehicle..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input type="date" onChange={e => setFromDate(e.target.value)} />
        <input type="date" onChange={e => setToDate(e.target.value)} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="dateDesc">Date ↓</option>
          <option value="dateAsc">Date ↑</option>
          <option value="amountDesc">Amount ↓</option>
          <option value="amountAsc">Amount ↑</option>
        </select>
        <button onClick={exportCSV}>⬇ CSV</button>
        <button onClick={exportPDF}>📄 PDF</button>
      </div>

      {/* TABLE */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Slot</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Exit Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredReceipts.map(r => (
            <tr key={r._id}>
              <td>{r.vehicleNumber}</td>
              <td>{r.slotId?.name}</td>
              <td>₹{r.fee}</td>
              <td>{r.paymentMode}</td>
              <td>{new Date(r.exitTime).toLocaleString()}</td>
              <td>
                <button onClick={() => setSelectedReceipt(r)}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div style={{ position: "fixed", inset: 0, background: "#0008" }}>
          <div
            id="receipt-ticket"
            className={receiptStyles.ticket}
            style={{ margin: "8% auto" }}
          >
            {/* ✅ BRAND HEADER */}
            <div className={receiptStyles.brandHeader}>
              <img src="/assets/logo.png" alt="ParkMate" className={receiptStyles.logo} />
              <div>
                <div className={receiptStyles.brandName}>ParkMate</div>
                <div className={receiptStyles.brandTag}>Smart Parking System</div>
              </div>
            </div>

            <div className={receiptStyles.divider}></div>

            <div className={receiptStyles.row}>
              <span>Vehicle</span>
              <span>{selectedReceipt.vehicleNumber}</span>
            </div>

            <div className={receiptStyles.row}>
              <span>Slot</span>
              <span>{selectedReceipt.slotId?.name}</span>
            </div>

            <div className={receiptStyles.row}>
              <span>Amount</span>
              <span>₹{selectedReceipt.fee}</span>
            </div>

            <div className={receiptStyles.row}>
              <span>Payment</span>
              <span>{selectedReceipt.paymentMode}</span>
            </div>

            <div className={receiptStyles.qr}>
              <QRCodeCanvas
                value={JSON.stringify({
                  brand: "ParkMate",
                  vehicle: selectedReceipt.vehicleNumber,
                  amount: selectedReceipt.fee,
                })}
                size={120}
              />
            </div>

            <div className={receiptStyles.actions}>
              <button onClick={() => window.print()}>Print</button>
              <button onClick={() => sendWhatsApp(selectedReceipt)}>WhatsApp</button>
              <button
                style={{ background: "#ef4444" }}
                onClick={() => deleteReceipt(selectedReceipt._id)}
              >
                Refund / Delete
              </button>
              <button onClick={() => setSelectedReceipt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptHistory;