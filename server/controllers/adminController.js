// controllers/adminController.js
exports.getReceipts = async (req, res) => {
  const receipts = await ParkingEntry.find({
    status: "Exited",
  })
    .populate("slotId")
    .sort({ exitTime: -1 });

  res.json(receipts);
};
