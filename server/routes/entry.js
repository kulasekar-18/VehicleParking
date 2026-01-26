const express = require("express");
const router = express.Router();
const Slot = require("../models/Slot");
const Entry = require("../models/Entry");

router.post("/", async (req, res) => {
  try {
    const { ownerName, ownerMobile, vehicleNumber, vehicleType, slotId } =
      req.body;

    if (
      !ownerName ||
      !ownerMobile ||
      !vehicleNumber ||
      !vehicleType ||
      !slotId
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // prevent duplicate entry
    const alreadyParked = await Entry.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      exitTime: null,
    });

    if (alreadyParked) {
      return res.status(400).json({ message: "Vehicle already parked" });
    }

    const slot = await Slot.findOne({
      _id: slotId,
      status: "available",
      type: vehicleType,
    });

    if (!slot) {
      return res.status(400).json({ message: "Slot not available" });
    }

    const entry = await Entry.create({
      ownerName,
      ownerMobile,
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      slotId,
      entryTime: new Date(),
      status: "Parked",
    });

    slot.status = "booked";
    await slot.save();

    res.status(201).json({
      message: "Vehicle entry successful",
      entry,
    });
  } catch (error) {
    console.error("ENTRY ERROR:", error);
    res.status(500).json({
      message: "Entry Time failed",
      error: error.message,
    });
  }
});

module.exports = router;
