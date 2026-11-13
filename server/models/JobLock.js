const mongoose = require("mongoose");

const JobLockSchema = new mongoose.Schema({
  _id: { type: String },
  lockedUntil: { type: Date, required: true },
  owner: { type: String, required: true },
});

module.exports = mongoose.model("JobLock", JobLockSchema);
