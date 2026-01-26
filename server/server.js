const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Slot = require("./models/Slot");
const bookingRoutes = require("./routes/bookingRoutes");
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ⏱ AUTO UNLOCK EXPIRED SLOTS (runs every 1 minute)
setInterval(async () => {
  try {
    const result = await Slot.updateMany(
      {
        status: "locked",
        lockExpiresAt: { $lt: new Date() },
      },
      {
        status: "available",
        lockedBy: null,
        lockExpiresAt: null,
      }
    );

    if (result.modifiedCount > 0) {
      console.log("🔓 Auto-unlocked expired slots:", result.modifiedCount);
    }
  } catch (err) {
    console.error("❌ Auto-unlock error:", err.message);
  }
}, 60 * 1000);

/* ================= MODELS ================= */

/* ---------- USER ---------- */
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "user" },
    vehicleNumber: String,

    activityLogs: [
      {
        action: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema); // ✅ ADDED
/* ---------- ENTRY ---------- */
const entrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    ownerName: String,
    ownerMobile: String,
    vehicleNumber: { type: String, uppercase: true },
    vehicleType: { type: String, enum: ["Car", "Bike"] },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: "Slot" },

    entryTime: { type: Date, default: Date.now },
    exitTime: Date,
    durationMinutes: Number,
    fee: Number,

    paymentStatus: { type: String, default: "Unpaid" },
    paymentMode: { type: String, default: "Cash" },
    status: { type: String, default: "Parked" },
  },
  { timestamps: true }
);

const Entry = mongoose.model("Entry", entrySchema);

/* ================= ADMIN ENTRIES ================= */
app.get("/api/admin/entries", async (req, res) => {
  try {
    const entries = await Entry.find()
      .populate("slotId", "name type")
      .sort({ createdAt: -1 });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch entries" });
  }
});

/* ================= CREATE EMPLOYEE ================= */
app.post("/api/admin/employees", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const employee = await User.create({
      name,
      email,
      password: hashed,
      role: "employee",
      activityLogs: [{ action: "EMPLOYEE_CREATED" }],
    });

    res.json({ message: "Employee created", employee });
  } catch (err) {
    res.status(500).json({ message: "Failed to create employee" });
  }
});

/* ================= DAILY REVENUE REPORT ================= */
app.get("/api/admin/revenue/daily", async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const entries = await Entry.find({
      status: "Exited",
      exitTime: { $gte: start, $lte: end },
    });

    const totalRevenue = entries.reduce((s, e) => s + (e.fee || 0), 0);

    res.json({
      date: start.toDateString(),
      totalRevenue,
      totalVehicles: entries.length,
      entries,
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch daily revenue" });
  }
});

/* ================= AUTH ================= */

/* REGISTER */
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashed,
      role: role || "user",
      activityLogs: [{ action: "REGISTER" }],
    });

    res.json({ message: "Register successful" });
  } catch {
    res.status(500).json({ message: "Register failed" });
  }
});

/* LOGIN */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    user.activityLogs.push({ action: "LOGIN" });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        vehicleNumber: user.vehicleNumber || "",
      },
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});

/* ================= PUBLIC SLOTS ================= */
app.get("/api/slots", async (req, res) => {
  try {
    const slots = await Slot.find({ status: "available" }).sort({ name: 1 });
    res.json(slots);
  } catch {
    res.status(500).json({ message: "Failed to fetch slots" });
  }
});

/* ================= USER PROFILE ================= */
app.put("/api/users/:id", async (req, res) => {
  try {
    const { name, email, vehicleNumber } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (vehicleNumber) user.vehicleNumber = vehicleNumber;

    user.activityLogs.push({ action: "PROFILE_UPDATED" });
    await user.save();

    res.json(user);
  } catch {
    res.status(500).json({ message: "Profile update failed" });
  }
});

/* ================= USER ACTIVITY (SELF) ================= */
app.get("/api/users/:id/activity", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("activityLogs");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.activityLogs.reverse());
  } catch {
    res.status(500).json({ message: "Failed to fetch activity" });
  }
});

/* ================= USER ENTRIES ================= */
app.get("/api/users/:id/entries", async (req, res) => {
  try {
    const entries = await Entry.find({
      userId: req.params.id,
    })
      .populate("slotId", "name type")
      .sort({ createdAt: -1 });

    res.json(entries);
  } catch {
    res.status(500).json({ message: "Failed to fetch user entries" });
  }
});

/* ENTRY */
app.post("/api/parking/entry", async (req, res) => {
  try {
    const {
      userId,
      ownerName,
      ownerMobile,
      vehicleNumber,
      vehicleType,
      slotId,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    const slot = await Slot.findOne({ _id: slotId, status: "available" });
    if (!slot) return res.status(400).json({ message: "Slot not available" });

    const entry = await Entry.create({
      userId,
      ownerName,
      ownerMobile,
      vehicleNumber,
      vehicleType,
      slotId,
    });

    const employee = await User.findById(userId);
    if (employee && employee.role === "employee") {
      employee.activityLogs.push({ action: "ENTRY_CREATED" });
      await employee.save();
    }

    slot.status = "booked";
    await slot.save();

    res.json({ message: "Entry success", entry });
  } catch (err) {
    console.error("ENTRY ERROR:", err);
    res.status(500).json({ message: "Entry failed" });
  }
});

/* EXIT (CASH + ONLINE) */
app.post("/api/parking/exit", async (req, res) => {
  try {
    const { vehicleNumber, paymentMode } = req.body;
    if (!vehicleNumber) {
      return res.status(400).json({ message: "Vehicle number required" });
    }

    const entry = await Entry.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: "Parked",
    }).populate("slotId");

    if (!entry) {
      return res.status(404).json({ message: "No active entry" });
    }

    const exitTime = new Date();
    const minutes = Math.ceil((exitTime - entry.entryTime) / 60000);
    const rate = entry.vehicleType === "Car" ? 100 : 50;
    const fee = Math.ceil(minutes / 60) * rate;

    entry.exitTime = exitTime;
    entry.durationMinutes = minutes;
    entry.fee = fee;
    entry.paymentStatus = "Paid";
    entry.paymentMode = paymentMode || "Cash";
    entry.status = "Exited";
    await entry.save();

    // ✅ LOG ACTIVITY USING userId
    const employee = await User.findById(entry.userId);
    if (employee && employee.role === "employee") {
      employee.activityLogs.push({ action: "EXIT_COMPLETED" });
      await employee.save();
    }

    if (entry.slotId) {
      entry.slotId.status = "available";
      await entry.slotId.save();
    }

    res.json({
      message: "Exit success",
      fee,
      paymentMode: entry.paymentMode,
      entry,
    });
  } catch (err) {
    console.error("EXIT ERROR:", err);
    res.status(500).json({ message: "Exit failed" });
  }
});

/* ================= ADMIN ================= */

/* ALL USERS */
app.get("/api/admin/users", async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

/* ================= ADMIN ACTIVITY TIMELINE ================= */
app.get("/api/admin/activity", async (req, res) => {
  try {
    const users = await User.find().select("email activityLogs");

    const timeline = [];

    users.forEach((u) => {
      u.activityLogs.forEach((log) => {
        timeline.push({
          email: u.email,
          action: log.action,
          at: log.at,
        });
      });
    });

    timeline.sort((a, b) => new Date(b.at) - new Date(a.at));
    res.json(timeline);
  } catch {
    res.status(500).json({ message: "Failed to fetch activity timeline" });
  }
});

/* ================= ADMIN SLOTS ================= */

/* GET ALL SLOTS (ADMIN) */
app.get("/api/admin/slots", async (req, res) => {
  try {
    const slots = await Slot.find().sort({ createdAt: -1 });
    res.json(slots);
  } catch {
    res.status(500).json({ message: "Failed to fetch slots" });
  }
});

/* CREATE SLOT (ADMIN) */
app.post("/api/admin/slots", async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Name and type required" });
    }

    const exists = await Slot.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: "Slot already exists" });
    }

    const slot = await Slot.create({ name, type });
    res.json(slot);
  } catch {
    res.status(500).json({ message: "Failed to create slot" });
  }
});

/* UPDATE SLOT (ADMIN) */
app.put("/api/admin/slots/:id", async (req, res) => {
  try {
    const { name, type } = req.body;

    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    slot.name = name;
    slot.type = type;
    await slot.save();

    res.json(slot);
  } catch {
    res.status(500).json({ message: "Failed to update slot" });
  }
});

/* DELETE SLOT (ADMIN) */
app.delete("/api/admin/slots/:id", async (req, res) => {
  try {
    await Slot.findByIdAndDelete(req.params.id);
    res.json({ message: "Slot deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete slot" });
  }
});

/* DELETE USER */
app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

/* ================= EMPLOYEE SHIFT ROUTES ================= */
const Shift = require("./models/Shift");

/* START SHIFT */
app.post("/api/employee/shift/start", async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID required" });
    }

    const activeShift = await Shift.findOne({
      employeeId,
      status: "active",
    });

    if (activeShift) {
      return res.status(400).json({ message: "Shift already active" });
    }

    const shift = await Shift.create({
      employeeId,
      shiftStart: new Date(),
      status: "active",
    });

    res.json({ message: "Shift started", shift });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* END SHIFT */
app.post("/api/employee/shift/end", async (req, res) => {
  try {
    const { employeeId } = req.body;

    const shift = await Shift.findOne({
      employeeId,
      status: "active",
    });

    if (!shift) {
      return res.status(400).json({ message: "No active shift" });
    }

    shift.shiftEnd = new Date();
    shift.status = "ended";
    await shift.save();

    res.json({ message: "Shift ended", shift });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= LOCK SLOT (NO PARAM VERSION) =================
/* ================= LOCK SLOT ================= */
app.post("/api/slots/:id/lock", async (req, res) => {
  try {
    const { userId } = req.body;
    const slotId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (slot.status !== "available") {
      return res.status(400).json({ message: "Slot already locked or booked" });
    }

    // ⏱ lock for 2 minutes
    slot.status = "locked";
    slot.lockedBy = userId;
    slot.lockExpiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await slot.save();

    res.json({
      message: "Slot locked",
      lockExpiresAt: slot.lockExpiresAt,
    });
  } catch (err) {
    console.error("LOCK ERROR:", err);
    res.status(500).json({ message: "Failed to lock slot" });
  }
});

// ================= BOOKINGS ROUTES =================
app.use("/api/bookings", bookingRoutes);
// ❗ LAST ROUTE
app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// ❗ SERVER START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
