import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: "" },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ userId: 1, endpoint: 1 });

export default mongoose.models.PushSubscription || mongoose.model("PushSubscription", pushSubscriptionSchema);
