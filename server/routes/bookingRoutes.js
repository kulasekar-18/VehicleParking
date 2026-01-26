const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");

/* ================= CREATE NEW BOOKING ================= */
router.post("/", async (req, res) => {
  try {
    const {
      vehicleNumber,
      slotId,
      ownerName,
      ownerMobile,
      userId,
      vehicleType,
      paymentMethod,
    } = req.body;

    if (!vehicleNumber || !slotId || !ownerName || !ownerMobile) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ message: "Slot not found" });

    if (slot.status === "booked") {
      return res.status(400).json({ message: "Slot already booked" });
    }

    const booking = new Booking({
      vehicleNumber,
      slot: slotId, // ✅ correct mapping
      ownerName,
      ownerMobile,
      userId,
      vehicleType,
      paymentMethod,
      status: "active", // ✅ FIX #1 (VERY IMPORTANT)
    });

    await booking.save();

    slot.status = "booked";
    await slot.save();

    res.status(201).json(booking);
  } catch (err) {
    console.error("❌ Create booking error:", err);
    res.status(500).json({ message: "Error creating booking" });
  }
});

/* ================= GET ALL BOOKINGS ================= */
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("slot", "name type")
      .populate("userId", "name email");

    res.json(bookings);
  } catch (error) {
    console.error("❌ Fetch bookings error:", error);
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

/* ================= GET BOOKING BY VEHICLE ================= */
router.get("/by-vehicle/:vehicleNumber", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      vehicleNumber: req.params.vehicleNumber,
      status: "active",
    }).populate("slot", "name type");

    if (!booking) {
      return res.status(404).json({ message: "Active booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error("❌ Fetch booking error:", error);
    res.status(500).json({ message: "Error fetching booking" });
  }
});

/* ================= EXIT VEHICLE ================= */
router.post("/exit/:vehicleNumber", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      vehicleNumber: req.params.vehicleNumber,
      status: "active",
    }).populate("slot", "name type");

    if (!booking || !booking.slot) {
      return res.status(404).json({ message: "Active booking not found" });
    }

    booking.exitTime = new Date();
    booking.status = "completed";

    const durationDays = Math.max(
      1,
      Math.ceil((booking.exitTime - booking.entryTime) / (1000 * 60 * 60 * 24))
    );

    const rate = booking.vehicleType === "Car" ? 100 : 50;
    booking.charges = durationDays * rate;

    await booking.save();

    await Slot.findByIdAndUpdate(booking.slot._id, {
      status: "available",
    });

    res.json({
      message: "Vehicle exited successfully",
      receipt: {
        slot: booking.slot.name,
        vehicleNumber: booking.vehicleNumber,
        durationDays,
        totalCost: booking.charges,
      },
    });
  } catch (error) {
    console.error("❌ Exit error:", error);
    res.status(500).json({ message: "Error during exit" });
  }
});

/* ================= CANCEL BOOKING ================= */
router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    await Slot.findByIdAndUpdate(booking.slot, { status: "available" });
    await Booking.findByIdAndDelete(req.params.id);

    res.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("❌ Cancel error:", error);
    res.status(500).json({ message: "Error cancelling booking" });
  }
});

/* ================= GET BOOKINGS BY USER ================= */
router.get("/by-user/:userId", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId })
      .populate("slot", "name type")
      .sort({ entryTime: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("❌ User bookings error:", error);
    res.status(500).json({ message: "Error fetching user bookings" });
  }
});

/* ================= INVOICE ================= */
router.get("/invoices/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      "slot",
      "name"
    );
    if (!booking) return res.status(404).send("Invoice not found");

    const durationDays = Math.max(
      1,
      Math.ceil((booking.exitTime - booking.entryTime) / (1000 * 60 * 60 * 24))
    );

    res.send(`
      <h2>Parking Invoice</h2>
      <p>Owner: ${booking.ownerName}</p>
      <p>Vehicle: ${booking.vehicleNumber}</p>
      <p>Slot: ${booking.slot.name}</p>
      <p>Days: ${durationDays}</p>
      <p>Total: ₹${booking.charges}</p>
    `);
  } catch (error) {
    console.error("❌ Invoice error:", error);
    res.status(500).send("Error generating invoice");
  }
});

module.exports = router;
