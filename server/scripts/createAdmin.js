const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const exists = await User.findOne({ email: "kulasekar@gmail.com" });
  if (exists) {
    console.log("⚠️ Admin already exists");
    process.exit();
  }

  const hashed = await bcrypt.hash("sekar18", 10);

  await User.create({
    name: "Kulasekar",
    email: "kulasekar@gmail.com",
    password: hashed,
    role: "admin",
  });

  console.log("✅ Admin created");
  process.exit();
}

createAdmin();
