export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bankroll from "@/models/Bankroll";

const TX_TYPES = ["deposit", "withdraw", "stake", "win", "loss", "adjust"];

function effectiveDelta(type, amount) {
  // Convention: deposit/win/adjust(+) add to balance; withdraw/stake/loss subtract.
  switch (type) {
    case "deposit": return amount;
    case "win": return amount;
    case "adjust": return amount; // amount can be negative for downward adjustments
    case "withdraw": return -amount;
    case "stake": return -amount;
    case "loss": return -amount;
    default: return 0;
  }
}

async function getOrCreate(userId) {
  let b = await Bankroll.findOne({ userId });
  if (!b) b = await Bankroll.create({ userId });
  return b;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const b = await getOrCreate(session.user.id);

    // Build last-30-day balance series
    const days = 30;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = today.getTime() - (days - 1) * 24 * 60 * 60 * 1000;
    const sorted = [...b.transactions].sort((a, c) => new Date(a.createdAt) - new Date(c.createdAt));

    // Calculate balance at start of window
    let runningBal = b.startingBalance || 0;
    for (const tx of sorted) {
      if (new Date(tx.createdAt).getTime() < start) {
        runningBal += effectiveDelta(tx.type, tx.amount);
      }
    }

    const series = new Array(days).fill(0);
    let cursor = 0;
    for (let i = 0; i < days; i++) {
      const dayStart = start + i * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      while (cursor < sorted.length) {
        const tx = sorted[cursor];
        const ms = new Date(tx.createdAt).getTime();
        if (ms < start) { cursor++; continue; }
        if (ms >= dayEnd) break;
        runningBal += effectiveDelta(tx.type, tx.amount);
        cursor++;
      }
      series[i] = Math.round(runningBal * 100) / 100;
    }

    const profit = b.totalWon - b.totalStaked;
    const roi = b.totalStaked > 0 ? Math.round((profit / b.totalStaked) * 1000) / 10 : 0;

    return NextResponse.json({
      bankroll: {
        currency: b.currency,
        startingBalance: b.startingBalance,
        balance: b.balance,
        totalStaked: b.totalStaked,
        totalWon: b.totalWon,
        profit,
        roi,
      },
      series,
      transactions: sorted.slice(-50).reverse().map(t => ({
        _id: t._id,
        type: t.type,
        amount: t.amount,
        odds: t.odds,
        note: t.note,
        roundId: t.roundId,
        createdAt: t.createdAt,
      })),
    });
  } catch (e) {
    console.error("Bankroll GET error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    await connectDB();
    const b = await getOrCreate(session.user.id);

    // Reset / set starting balance
    if (action === "set_starting") {
      const value = Number(body.amount);
      if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
        return NextResponse.json({ error: "Invalid starting amount" }, { status: 400 });
      }
      b.startingBalance = value;
      b.balance = value;
      b.totalStaked = 0;
      b.totalWon = 0;
      b.transactions = [];
      await b.save();
      return NextResponse.json({ ok: true, bankroll: { balance: b.balance, startingBalance: b.startingBalance } });
    }

    // Add a transaction
    const { type, amount, odds, note, roundId } = body;
    if (!TX_TYPES.includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt === 0 || Math.abs(amt) > 1_000_000) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (type !== "adjust" && amt < 0) {
      return NextResponse.json({ error: "Amount must be positive (sign is implied by type)" }, { status: 400 });
    }

    b.transactions.push({
      type,
      amount: Math.abs(amt) * (type === "adjust" && amt < 0 ? -1 : 1),
      odds: odds ? Number(odds) : null,
      note: (note || "").slice(0, 200),
      roundId: roundId || null,
      createdAt: new Date(),
    });

    b.balance = Math.round((b.balance + effectiveDelta(type, type === "adjust" ? amt : Math.abs(amt))) * 100) / 100;
    if (type === "stake") b.totalStaked = Math.round((b.totalStaked + Math.abs(amt)) * 100) / 100;
    if (type === "win") b.totalWon = Math.round((b.totalWon + Math.abs(amt)) * 100) / 100;

    await b.save();
    return NextResponse.json({ ok: true, balance: b.balance });
  } catch (e) {
    console.error("Bankroll POST error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE — remove a transaction (with balance rollback)
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const txId = searchParams.get("txId");
    if (!txId) return NextResponse.json({ error: "txId required" }, { status: 400 });

    await connectDB();
    const b = await getOrCreate(session.user.id);
    const tx = b.transactions.id(txId);
    if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Reverse the delta
    const delta = effectiveDelta(tx.type, Math.abs(tx.amount));
    b.balance = Math.round((b.balance - delta) * 100) / 100;
    if (tx.type === "stake") b.totalStaked = Math.max(0, b.totalStaked - Math.abs(tx.amount));
    if (tx.type === "win") b.totalWon = Math.max(0, b.totalWon - Math.abs(tx.amount));

    tx.deleteOne();
    await b.save();
    return NextResponse.json({ ok: true, balance: b.balance });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
