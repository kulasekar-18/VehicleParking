const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    /* ================= VEHICLE INFO ================= */
    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerMobile: {
      type: String,
      required: true,
      trim: true,
    },

    /* ================= USER ================= */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* ================= SLOT ================= */
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
    },

    vehicleType: {
      type: String,
      enum: ["Car", "Bike"],
      required: true,
    },

    /* ================= TIMING ================= */
    entryTime: {
      type: Date,
      default: Date.now,
    },

    exitTime: {
      type: Date,
      default: null,
    },

    /* ================= STATUS ================= */
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
      index: true,
    },

    /* ================= BILLING ================= */
    charges: {
      type: Number,
      default: 0,
    },

    /* ================= PAYMENT ================= */
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Online"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },

    transactionId: {
      type: String, // Razorpay/UPI transaction id
      default: null,
    },

    /* ================= SECURITY ================= */
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

/* ================= INDEXES ================= */

// Faster search by vehicle
bookingSchema.index({ vehicleNumber: 1 });

// Faster active booking search
bookingSchema.index({ status: 1, entryTime: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
