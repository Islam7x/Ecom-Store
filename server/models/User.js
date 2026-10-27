const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String },
    name: String,
    picture: String,
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
    },

    password: {
      type: String,
      select: false,
      required: function () {
        return !this.googleId;
      },
    },
    isAdmin: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

// ── Database Indexes for Performance ─────────
// Note: email index is already created by unique: true constraint
UserSchema.index({ googleId: 1 });
UserSchema.index({ isAdmin: 1 });

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
