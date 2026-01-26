const express = require("express");
const router = express.Router();
const Slot = require("../models/Slot");
const Entry = require("../models/Entry");

/**
 * ================================
 * EXIT PREVIEW (NO DB UPDATE)
 * ================================
 * URL: POST /api/parking/exit-preview
 * Purpose:
 * - Find active vehicle
 * - Calculate duration & fee
 * - Return data for Razorpay
 */
router.post("/exit-preview", async (req, res) => {
  try {
    const { vehicleNumber } = req.body;

    if (!vehicleNumber) {
      return res.status(400).json({ message: "Vehicle number is required" });
    }

    const entry = await Entry.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      exitTime: null,
    }).populate("slotId");

    if (!entry) {
      return res
        .status(404)
        .json({ message: "No active parking found for this vehicle" });
    }

    const exitTime = new Date();
    const durationMs = exitTime - entry.entryTime;
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));

    // Fee calculation
    const hourlyRate = entry.vehicleType === "Car" ? 100 : 50;
    const hours = Math.ceil(durationMinutes / 60);
    const fee = hours * hourlyRate;

    res.status(200).json({
      entryId: entry._id,
      vehicleNumber: entry.vehicleNumber,
      vehicleType: entry.vehicleType,
      ownerName: entry.ownerName,
      ownerMobile: entry.ownerMobile,
      slotName: entry.slotId.name,
      entryTime: entry.entryTime,
      exitTime,
      durationMinutes,
      fee,
    });
  } catch (error) {
    res.status(500).json({
      message: "Exit preview failed",
      error: error.message,
    });
  }
});

/**
 * ================================
 * EXIT CONFIRM (AFTER PAYMENT)
 * ================================
 * URL: POST /api/parking/exit-confirm
 * Purpose:
 * - Save payment
 * - Update exit time
 * - Free slot
 * - Return final receipt
 */
router.post("/exit-confirm", async (req, res) => {
  try {
    const { entryId, paymentMethod, paymentId } = req.body;

    if (!entryId || !paymentMethod) {
      return res.status(400).json({
        message: "Entry ID and payment method are required",
      });
    }

    const entry = await Entry.findById(entryId).populate("slotId");

    if (!entry || entry.exitTime) {
      return res.status(400).json({ message: "Invalid or closed entry" });
    }

    const exitTime = new Date();
    const durationMs = exitTime - entry.entryTime;
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));

    const hourlyRate = entry.vehicleType === "Car" ? 100 : 50;
    const hours = Math.ceil(durationMinutes / 60);
    const fee = hours * hourlyRate;

    // Update entry record
    entry.exitTime = exitTime;
    entry.durationMinutes = durationMinutes;
    entry.fee = fee;
    entry.paymentMethod = paymentMethod;
    entry.paymentStatus = "Paid";
    entry.paymentId = paymentId || null;
    entry.status = "Exited";

    await entry.save();

    // Free parking slot
    entry.slotId.status = "available";
    await entry.slotId.save();

    res.status(200).json({
      message: "Vehicle exit completed successfully",
      receipt: {
        vehicleNumber: entry.vehicleNumber,
        vehicleType: entry.vehicleType,
        ownerName: entry.ownerName,
        ownerMobile: entry.ownerMobile,
        slotName: entry.slotId.name,
        entryTime: entry.entryTime,
        exitTime: entry.exitTime,
        durationMinutes,
        fee,
        paymentMethod,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Exit confirmation failed",
      error: error.message,
    });
  }
});

module.exports = router;
