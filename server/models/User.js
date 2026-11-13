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
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
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
    const rounds = Number(
      process.env.BCRYPT_ROUNDS ||
        (process.env.NODE_ENV === "test" ? 4 : 12),
    );
    this.password = await bcrypt.hash(this.password, rounds);
  }
});

UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
