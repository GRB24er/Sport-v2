// Non-destructive payment-settings updater.
//
// Sets your real payment addresses (BTC, USDT TRC20) and the MTN MoMo
// merchant info on the existing Settings document — does NOT touch users,
// rounds, predictions, or any other collection. Safe to run against
// production at any time. Idempotent.
//
// Usage:
//   1. Make sure MONGODB_URI is in .env.local (same one your app uses)
//   2. From the project root, run:
//      node scripts/update-payments.js
//
// Flags:
//   --force   Overwrite even if a value already exists in the DB.
//             Default behaviour only fills in fields that are empty.
//   --dry     Print the changes that would be made, don't write.
//
// If you'd rather click than type: log into the Admin dashboard,
// open Settings, and paste the same values into the relevant fields
// (Mobile Wallet 1 + USDT TRC20 + BTC Address). Same result.

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const PAYMENT_DEFAULTS = {
  // Crypto — public receiving addresses, safe to share with users
  cryptoEnabled: true,
  usdtTrc20Address: "TL3N5WCxyLvgU3rJWVo5er1ADJ1RJ74nBR",
  btcAddress:       "bc1q5z7zlud7pw855sn88uewcxx573nhtxyvj254la",
  // (usdtErc20Address intentionally left empty — add via admin UI if needed)

  // Mobile Money — single MTN merchant line
  momoEnabled: true,
  momoProviders: [
    {
      id: "momo_mtn",
      name: "MTN Mobile Money",
      number: "0598543640",
      accountName: "FLOPAT CLASSIC VENTURES",
      color: "#FFCB05",
      enabled: true,
    },
  ],
};

const FORCE = process.argv.includes("--force");
const DRY = process.argv.includes("--dry");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("\n❌  MONGODB_URI is not set. Add it to .env.local first.\n");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅  Connected to MongoDB\n");
  const settings = mongoose.connection.db.collection("settings");

  const existing = await settings.findOne({ key: "main" }) || {};
  const updates = {};
  const skipped = [];

  for (const [key, value] of Object.entries(PAYMENT_DEFAULTS)) {
    const current = existing[key];

    // momoProviders gets a special merge — replace only if empty or --force
    if (key === "momoProviders") {
      const currentList = Array.isArray(current) ? current : [];
      const isEmpty = currentList.length === 0;
      if (isEmpty || FORCE) updates[key] = value;
      else skipped.push(`${key} (${currentList.length} provider${currentList.length === 1 ? "" : "s"} already configured)`);
      continue;
    }

    const isEmptyString = typeof current === "string" && current.trim() === "";
    const isMissing = current === undefined || current === null;
    if (isMissing || isEmptyString || FORCE) updates[key] = value;
    else skipped.push(`${key} = ${JSON.stringify(current)}`);
  }

  if (Object.keys(updates).length === 0) {
    console.log("ℹ️   Nothing to update — all values already set. Use --force to overwrite.\n");
    for (const s of skipped) console.log("   skipped:", s);
    await mongoose.disconnect();
    return;
  }

  console.log("Will update:");
  for (const [k, v] of Object.entries(updates)) {
    const display = typeof v === "string" ? v : JSON.stringify(v);
    console.log(`  · ${k}: ${display}`);
  }
  if (skipped.length) {
    console.log("\nSkipping (use --force to overwrite):");
    for (const s of skipped) console.log(`  · ${s}`);
  }

  if (DRY) {
    console.log("\n--dry flag set, no writes performed.\n");
    await mongoose.disconnect();
    return;
  }

  await settings.updateOne(
    { key: "main" },
    { $set: { ...updates, updatedAt: new Date() } },
    { upsert: true }
  );

  console.log("\n✅  Settings updated. Live in the app immediately (admin Settings cache refreshes every 60s).\n");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌  Failed:", e.message);
  process.exit(1);
});
