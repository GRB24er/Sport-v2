import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const gamePackageSchema = new mongoose.Schema({
  package: { type: String, enum: ["gold", "platinum", "diamond"], required: true },
  predictionsUsed: { type: Number, default: 0 },
  activatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, { _id: false });

const pendingRequestSchema = new mongoose.Schema({
  package: { type: String, enum: ["gold", "platinum", "diamond"], required: true },
  referenceNumber: { type: String, required: true },
  paymentProvider: { type: String, required: true },
  senderName: { type: String, default: "" },
  paymentProofUrl: { type: String, default: "" },
  date: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String, required: true, trim: true, lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
    },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },

    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: { type: String, enum: ["pending", "approved", "rejected", "suspended", "banned", "blocked"], default: "pending" },

    gamePackages: { type: Map, of: gamePackageSchema, default: {} },
    pendingGamePackages: { type: Map, of: pendingRequestSchema, default: {} },

    referenceNumber: { type: String, required: true, trim: true },
    paymentProvider: { type: String, default: "" },
    amountPaid: { type: Number, default: 0 },

    bettingId: { type: String, trim: true },

    referralCode: { type: String, default: null, trim: true },
    referredBy: { type: String, default: null, trim: true },
    referralBalance: { type: Number, default: 0 },
    referralTotalEarned: { type: Number, default: 0 },
    referralCount: { type: Number, default: 0 },

    paymentProofUrl: { type: String, default: "" },
    avatar: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: String, default: null },

    // Legal / compliance — captured at signup
    confirmedAdult: { type: Boolean, default: false },
    acceptedTermsAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// === DATABASE INDEXES for fast queries ===
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ status: 1, createdAt: -1 });
userSchema.index({ referralCode: 1 }, { sparse: true });
userSchema.index({ referredBy: 1 }, { sparse: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre("save", function (next) {
  if (!this.avatar && this.name) {
    this.avatar = this.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.models.User || mongoose.model("User", userSchema);
