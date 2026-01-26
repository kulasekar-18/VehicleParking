const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    ownerName: String,
    ownerMobile: String,
    vehicleNumber: { type: String, uppercase: true },
    vehicleType: { type: String, enum: ["Car", "Bike"] },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: "Slot" },

    entryTime: { type: Date, default: Date.now },
    exitTime: { type: Date, default: null },

    durationMinutes: Number,
    fee: Number,

    paymentMethod: String,
    paymentStatus: { type: String, default: "Unpaid" },

    status: { type: String, enum: ["Parked", "Exited"], default: "Parked" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Entry", entrySchema);
