const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // B1, B2 consistency
    },

    type: {
      type: String,
      enum: ["Car", "Bike"],
      required: true,
    },

    /* ================= STATUS ================= */
    status: {
      type: String,
      enum: ["available", "locked", "booked"],
      default: "available",
      index: true,
    },

    /* ================= LIVE LOCK SYSTEM ================= */
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lockedAt: {
      type: Date,
      default: null,
    },

    lockExpiresAt: {
      type: Date,
      default: null,
      index: true, // ⚡ fast auto unlock query
    },

    /* ================= FINAL BOOKING ================= */
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= INDEXES ================= */

// Fast filtering by status + auto unlock
slotSchema.index({ status: 1, lockExpiresAt: 1 });

// Prevent duplicate name (extra safety)
slotSchema.index({ name: 1 }, { unique: true });

/* ================= AUTO CLEAN LOCK HELPER ================= */
/*
  This does NOT auto-unlock.
  Your setInterval in server handles that.
  But this ensures clean state consistency.
*/

slotSchema.methods.isLockExpired = function () {
  if (!this.lockExpiresAt) return false;
  return new Date() > this.lockExpiresAt;
};

module.exports = mongoose.model("Slot", slotSchema);
