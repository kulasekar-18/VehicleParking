import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const generateBillPDF = (bill) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("🚗 Parking Bill", 14, 20);

  doc.setFontSize(12);
  doc.text(`Vehicle: ${bill.vehicleNumber}`, 14, 35);
  doc.text(`Type: ${bill.vehicleType}`, 14, 45);
  doc.text(`Slot: ${bill.slotName}`, 14, 55);

  doc.text(`Entry Time: ${new Date(bill.entryTime).toLocaleString()}`, 14, 70);
  doc.text(`Exit Time: ${new Date(bill.exitTime).toLocaleString()}`, 14, 80);
  doc.text(`Duration: ${bill.durationMinutes} minutes`, 14, 90);

  autoTable(doc, {
    startY: 105,
    head: [["Description", "Amount"]],
    body: [["Parking Charges", `₹${bill.amount}`]],
  });

  doc.text(`Payment ID: ${bill.paymentId}`, 14, doc.lastAutoTable.finalY + 15);
  doc.text(
    "Thank you for parking with ParkMate 🙏",
    14,
    doc.lastAutoTable.finalY + 30
  );

  doc.save(`Bill-${bill.vehicleNumber}.pdf`);
};

export default generateBillPDF;
