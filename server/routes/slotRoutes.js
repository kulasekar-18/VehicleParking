const express = require("express");
const router = express.Router();
const Slot = require("../models/Slot");
const mongoose = require("mongoose");

/* =========================================================
   🔁 AUTO UNLOCK EXPIRED SLOTS (runs on every request)
========================================================= */
const unlockExpiredSlots = async () => {
  await Slot.updateMany(
    {
      status: "locked",
      lockExpiresAt: { $lt: new Date() },
    },
    {
      status: "available",
      lockedBy: null,
      lockedAt: null,
      lockExpiresAt: null,
    }
  );
};

/* =========================================================
   ✅ GET ALL SLOTS (with filters)
========================================================= */
router.get("/", async (req, res) => {
  try {
    await unlockExpiredSlots();

    const { type, status } = req.query;
    let filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;

    const slots = await Slot.find(filter)
      .populate("lockedBy", "name email")
      .populate("bookedBy", "name email");

    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: "Error fetching slots", error });
  }
});

/* =========================================================
   ✅ ADD NEW SLOT
========================================================= */
router.post("/", async (req, res) => {
  try {
    const { name, slotNumber, type } = req.body;
    const finalName = name || slotNumber;

    if (!finalName || !type) {
      return res
        .status(400)
        .json({ message: "Name/SlotNumber and type are required" });
    }

    const slot = new Slot({
      name: finalName,
      type,
    });

    await slot.save();
    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ message: "Error adding slot", error });
  }
});

/* =========================================================
   🔒 LOCK SLOT (LIVE HOLD – 2 MIN)
========================================================= */
router.post("/:id/lock", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid slot ID" });
    }

    const slot = await Slot.findById(id);

    if (!slot) return res.status(404).json({ message: "Slot not found" });

    if (slot.status !== "available") {
      return res.status(400).json({ message: "Slot not available" });
    }

    const lockTime = new Date();
    const expires = new Date(lockTime.getTime() + 2 * 60 * 1000); // 2 min

    slot.status = "locked";
    slot.lockedBy = userId;
    slot.lockedAt = lockTime;
    slot.lockExpiresAt = expires;

    await slot.save();

    res.json({
      message: "Slot locked for 2 minutes",
      slot,
    });
  } catch (error) {
    res.status(500).json({ message: "Error locking slot", error });
  }
});

/* =========================================================
   🔓 UNLOCK SLOT (CANCEL / TIMEOUT)
========================================================= */
router.post("/:id/unlock", async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);

    if (!slot) return res.status(404).json({ message: "Slot not found" });

    slot.status = "available";
    slot.lockedBy = null;
    slot.lockedAt = null;
    slot.lockExpiresAt = null;

    await slot.save();

    res.json({ message: "Slot unlocked", slot });
  } catch (error) {
    res.status(500).json({ message: "Error unlocking slot", error });
  }
});

/* =========================================================
   🚗 FINAL BOOK SLOT
========================================================= */
router.post("/:id/book", async (req, res) => {
  try {
    const { userId } = req.body;
    const slot = await Slot.findById(req.params.id);

    if (!slot) return res.status(404).json({ message: "Slot not found" });

    if (slot.status !== "locked") {
      return res.status(400).json({ message: "Slot not locked" });
    }

    slot.status = "booked";
    slot.bookedBy = userId;
    slot.lockedBy = null;
    slot.lockedAt = null;
    slot.lockExpiresAt = null;

    await slot.save();

    res.json({ message: "Slot booked successfully", slot });
  } catch (error) {
    res.status(500).json({ message: "Error booking slot", error });
  }
});

/* =========================================================
   ❌ DELETE SLOT
========================================================= */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Slot.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Slot not found" });
    res.json({ message: "Slot deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting slot", error });
  }
});

/* =========================================================
   ❌ DELETE ALL SLOTS
========================================================= */
router.delete("/delete-all", async (req, res) => {
  try {
    await Slot.deleteMany({});
    res.json({ message: "All slots deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting all slots", error });
  }
});

// 🔒 LOCK SLOT (LIVE LOCK)
router.post("/:id/lock", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    const lockMinutes = 2;
    const expires = new Date(Date.now() + lockMinutes * 60 * 1000);

    const slot = await Slot.findOneAndUpdate(
      { _id: req.params.id, status: "available" },
      {
        status: "locked",
        lockedBy: userId,
        lockedAt: new Date(),
        lockExpiresAt: expires,
      },
      { new: true }
    );

    if (!slot) {
      return res.status(409).json({ message: "Slot already locked or booked" });
    }

    res.json(slot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lock failed" });
  }
});

module.exports = router;
