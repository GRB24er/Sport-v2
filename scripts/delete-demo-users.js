// One-shot: delete the demo users that lib/seed.js inserts.
// Runs locally against your MongoDB Atlas DB — does not depend on the
// admin UI, the API, the Vercel deploy, or any cache.
//
// Usage:
//   1. Make sure MONGODB_URI is in .env.local (the same one your app uses)
//   2. From the project root:
//        node scripts/delete-demo-users.js
//   3. To preview without deleting, add --dry:
//        node scripts/delete-demo-users.js --dry

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const DRY = process.argv.includes("--dry");

const TARGETS = {
  emails: ["james@email.com", "maria@email.com", "ahmed@email.com"],
  names:  ["James Wilson", "Maria Santos", "Ahmed Hassan"],
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("\n❌  MONGODB_URI is not set. Add it to .env.local first.\n");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅  Connected to MongoDB\n");
  const db = mongoose.connection.db;

  const query = {
    $or: [
      { email: { $in: TARGETS.emails.map(e => new RegExp(`^${e}$`, "i")) } },
      { name:  { $in: TARGETS.names } },
    ],
  };

  const found = await db.collection("users").find(query).project({ name: 1, email: 1, phone: 1 }).toArray();

  if (found.length === 0) {
    console.log("ℹ️   No demo users found. Nothing to delete.\n");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${found.length} demo user${found.length === 1 ? "" : "s"}:`);
  for (const u of found) console.log(`  · ${u.name}  <${u.email}>  ${u.phone || ""}`);
  console.log();

  if (DRY) {
    console.log("--dry flag set, no deletions performed.\n");
    await mongoose.disconnect();
    return;
  }

  const ids = found.map(u => u._id);

  // Cascade: remove their predictions, notifications, uploads, push subs,
  // bankrolls, achievements, chat threads — anything keyed off userId.
  const cascade = [
    { coll: "predictions",      filter: { userId: { $in: ids } } },
    { coll: "uploads",          filter: { userId: { $in: ids } } },
    { coll: "notifications",    filter: { $or: [{ relatedUserId: { $in: ids } }, { forUserId: { $in: ids } }] } },
    { coll: "pushsubscriptions", filter: { userId: { $in: ids } } },
    { coll: "bankrolls",        filter: { userId: { $in: ids } } },
    { coll: "achievements",     filter: { userId: { $in: ids } } },
    { coll: "chatthreads",      filter: { userId: { $in: ids } } },
  ];

  for (const { coll, filter } of cascade) {
    try {
      const r = await db.collection(coll).deleteMany(filter);
      if (r.deletedCount > 0) console.log(`  cleaned ${coll}: ${r.deletedCount}`);
    } catch (e) {
      // Collection might not exist yet — that's fine
    }
  }

  // Finally, delete the user docs themselves
  const result = await db.collection("users").deleteMany({ _id: { $in: ids } });
  console.log(`\n✅  Deleted ${result.deletedCount} demo user${result.deletedCount === 1 ? "" : "s"}.\n`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("\n❌  Failed:", e.message, "\n");
  process.exit(1);
});
