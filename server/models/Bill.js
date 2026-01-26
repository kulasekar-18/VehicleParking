const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    entryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entry",
      required: true,
    },
    vehicleNumber: String,
    vehicleType: String,
    slotName: String,
    ownerName: String,
    ownerMobile: String,

    entryTime: Date,
    exitTime: Date,
    durationMinutes: Number,

    amount: Number,
    paymentId: String,
    paymentMethod: {
      type: String,
      default: "Razorpay",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);
