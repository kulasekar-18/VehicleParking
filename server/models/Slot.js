const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
      index: true, // ⚡ fast auto-unlock
    },

    /* ================= FINAL BOOKING ================= */
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

/* ================= INDEXES ================= */

/**
 * Optimizes queries like:
 * - find available slots
 * - auto-unlock expired locks
 */
slotSchema.index({ status: 1, lockExpiresAt: 1 });

/**
 * Prevent same slot being booked twice logically
 * (handled in code, index helps performance)
 */
slotSchema.index({ _id: 1, status: 1 });

module.exports = mongoose.model("Slot", slotSchema);
