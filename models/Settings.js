import mongoose from "mongoose";

const momoProviderSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  number: { type: String, required: true },
  accountName: { type: String, default: "" },
  color: { type: String, default: "#0B9635" },
  enabled: { type: Boolean, default: true },
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: "main", unique: true },
  siteName: { type: String, default: "BetGenius AI" },
  siteTagline: { type: String, default: "Expert Football Predictions" },
  signupFee: { type: Number, default: 20 },
  referralBonus: { type: Number, default: 2 },
  goldPrice: { type: Number, default: 40 }, goldMaxPreds: { type: Number, default: 3 }, goldOdds: { type: String, default: "15-25 Odds" },
  platinumPrice: { type: Number, default: 80 }, platinumMaxPreds: { type: Number, default: 3 }, platinumOdds: { type: String, default: "25-50 Odds" },
  diamondPrice: { type: Number, default: 160 }, diamondMaxPreds: { type: Number, default: 3 }, diamondOdds: { type: String, default: "HT/FT & Correct Score" },
  // Mobile Money — Generic configurable providers
  momoEnabled: { type: Boolean, default: false },
  momoProviders: { type: [momoProviderSchema], default: [] },
  // Mobile Money — Single merchant override (one number across all networks).
  // If set, it takes priority over the per-network momoProviders entries.
  merchantMomoNumber: { type: String, default: "" },
  merchantMomoName: { type: String, default: "" },
  // Crypto Wallets
  usdtTrc20Address: { type: String, default: "" },
  usdtErc20Address: { type: String, default: "" },
  btcAddress: { type: String, default: "" },
  cryptoEnabled: { type: Boolean, default: true },
  // Card Payments
  cardEnabled: { type: Boolean, default: false },
  cardProvider: { type: String, default: "stripe" }, // "stripe" or "paystack"
  stripePublicKey: { type: String, default: "" },
  paystackPublicKey: { type: String, default: "" },
  // Package Duration (days)
  goldDurationDays: { type: Number, default: 30 },
  platinumDurationDays: { type: Number, default: 30 },
  diamondDurationDays: { type: Number, default: 30 },
  // Contact
  whatsappNumber: { type: String, default: "" },
  supportEmail: { type: String, default: "support@betgenius.ai" },

  // AI Predictor model selection per tier (overrides PPQ_MODEL env)
  aiModelGold: { type: String, default: "" },
  aiModelPlatinum: { type: String, default: "" },
  aiModelDiamond: { type: String, default: "" },
  aiModelChat: { type: String, default: "" },

  // AI Chat Assistant
  aiChatEnabled: { type: Boolean, default: true },
  aiChatDailyLimit: { type: Number, default: 20 },

  // Push notifications (VAPID — generate once with `npx web-push generate-vapid-keys`)
  pushEnabled: { type: Boolean, default: false },
  vapidPublicKey: { type: String, default: "" },
  vapidPrivateKey: { type: String, default: "" },
  vapidSubject: { type: String, default: "mailto:support@betgenius.ai" },

  // Daily free prediction
  dailyFreeEnabled: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model("Settings", settingsSchema);
