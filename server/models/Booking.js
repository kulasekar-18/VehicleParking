const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true },
  ownerName: { type: String, required: true },
  ownerMobile: { type: String, required: true },

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

  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date },

  status: {
    type: String,
    enum: ["active", "completed"],
    default: "active",
  },

  charges: { type: Number, default: 0 },

  paymentMethod: {
    type: String,
    enum: ["Cash", "UPI"],
    required: true,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);
