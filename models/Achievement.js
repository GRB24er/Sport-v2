import mongoose from "mongoose";

// Earned achievement record. Catalog of available badges lives in lib/achievements.js
const achievementSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    badgeId: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

achievementSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

export default mongoose.models.Achievement || mongoose.model("Achievement", achievementSchema);
