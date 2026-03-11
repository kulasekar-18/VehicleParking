const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");

const router = express.Router();

// ✅ Multer setup for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/avatars"),
  filename: (req, file, cb) => {
    cb(
      null,
      req.params.id + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage });

// ✅ Update user profile (with avatar upload)
router.put("/:id", upload.single("avatar"), async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      email: req.body.email,
      vehicleNumber: req.body.vehicleNumber,
    };

    if (req.file) {
      updateData.avatar = `/uploads/avatars / $ { req.file.filename }`;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
});

module.exports = router;
