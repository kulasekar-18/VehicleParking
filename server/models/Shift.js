const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shiftStart: Date,
    shiftEnd: Date,
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shift", shiftSchema);
