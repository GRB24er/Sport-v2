const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("Set MONGODB_URI in .env.local"); process.exit(1); }

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  await db.collection("users").deleteMany({});
  await db.collection("predictions").deleteMany({});
  await db.collection("notifications").deleteMany({});
  await db.collection("uploads").deleteMany({});
  await db.collection("messages").deleteMany({});
  await db.collection("settings").deleteMany({});
  console.log("Cleared all data");

  // Create default settings
  await db.collection("settings").insertOne({
    key: "main",
    siteName: "BetGenius AI",
    siteTagline: "AI-Powered Betting Predictions",
    referralBonus: 2,
    referralEnabled: true,
    signupFee: 20,
    goldPrice: 40, goldMaxPreds: 3, goldOdds: "15-25 Odds",
    platinumPrice: 80, platinumMaxPreds: 3, platinumOdds: "25-50 Odds",
    diamondPrice: 160, diamondMaxPreds: 3, diamondOdds: "HT/FT & Correct Score",
    momoEnabled: true,
    momoProviders: [
      { id: "momo_mtn", name: "MTN Mobile Money", number: "0598543640", accountName: "FLOPAT CLASSIC VENTURES", color: "#FFCB05", enabled: true },
    ],
    cryptoEnabled: true,
    usdtTrc20Address: "TL3N5WCxyLvgU3rJWVo5er1ADJ1RJ74nBR",
    btcAddress: "bc1q5z7zlud7pw855sn88uewcxx573nhtxyvj254la",
    cardEnabled: false,
    whatsappNumber: "",
    supportEmail: "support@betgenius.ai",
    createdAt: new Date(), updatedAt: new Date(),
  });
  console.log("Default settings created");

  const pw = await bcrypt.hash("pass123", 12);

  const users = await db.collection("users").insertMany([
    {
      name: "James Wilson", email: "james@email.com", phone: "+14155551234", password: pw,
      role: "user", status: "approved",
      gamePackages: { epl: { tier: "gold", roundsLeft: 3, roundsViewed: 0, purchasedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) } },
      pendingGamePackages: {},
      referenceNumber: "TXN-8374652", paymentProvider: "usdt_trc20",
      bettingId: "BG-14155551234",
      referralCode: "BG-1234-3X7R", referredBy: null,
      amountPaid: 60, referralBalance: 2, referralTotalEarned: 2, referralCount: 1,
      avatar: "JW", approvedAt: new Date(), createdAt: new Date("2025-03-01"), updatedAt: new Date(),
    },
    {
      name: "Maria Santos", email: "maria@email.com", phone: "+447911123456", password: pw,
      role: "user", status: "approved",
      gamePackages: {},
      pendingGamePackages: {},
      referenceNumber: "TXN-9283746", paymentProvider: "btc",
      bettingId: "BG-447911123456",
      referralCode: null, referredBy: "BG-1234-3X7R",
      amountPaid: 20, referralBalance: 0, referralTotalEarned: 0, referralCount: 0,
      avatar: "MS", approvedAt: new Date(), createdAt: new Date("2025-03-02"), updatedAt: new Date(),
    },
    {
      name: "Ahmed Hassan", email: "ahmed@email.com", phone: "+201012345678", password: pw,
      role: "user", status: "pending",
      gamePackages: {},
      pendingGamePackages: {},
      referenceNumber: "TXN-1029384", paymentProvider: "usdt_erc20",
      bettingId: "BG-201012345678",
      referralCode: null, referredBy: "BG-1234-3X7R",
      amountPaid: 20, referralBalance: 0, referralTotalEarned: 0, referralCount: 0,
      avatar: "AH", createdAt: new Date("2025-03-05"), updatedAt: new Date(),
    },
  ]);

  console.log(`Seeded ${users.insertedCount} users`);

  console.log("\nDemo Logins:");
  console.log(`   Admin: ${process.env.ADMIN_EMAIL || process.env.ADMIN_PHONE} / ${process.env.ADMIN_PASSWORD}`);
  console.log("   User (has Gold pkg): james@email.com / pass123");
  console.log("   User (no package yet): maria@email.com / pass123");
  console.log("   User (pending): ahmed@email.com / pass123");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(e => { console.error("Seed failed:", e); process.exit(1); });
