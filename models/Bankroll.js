import mongoose from "mongoose";

const txSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["deposit", "withdraw", "stake", "win", "loss", "adjust"], required: true },
    amount: { type: Number, required: true }, // positive number; sign applied by `type`
    odds: { type: Number, default: null }, // if linked to a bet
    note: { type: String, default: "" },
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: "Round", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const bankrollSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    currency: { type: String, default: "USD" },
    startingBalance: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    totalStaked: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 },
    transactions: { type: [txSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Bankroll || mongoose.model("Bankroll", bankrollSchema);
