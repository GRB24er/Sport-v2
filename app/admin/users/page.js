"use client";

import { useState, useEffect } from "react";
import { Button, Badge, Loading } from "@/components/ui";
import { PACKAGES, SIGNUP_FEE, fmtUSD } from "@/lib/constants";
import toast from "react-hot-toast";

const STATUS_COLORS = { approved:"green", pending:"orange", rejected:"red", banned:"red", blocked:"red", suspended:"orange" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/users?status=${filter}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); load(); }, [filter]);

  const approve = async (id) => {
    try {
      const res = await fetch("/api/users/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id }) });
      if (res.ok) { toast.success("Approved!"); load(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Failed"); }
    } catch (err) { toast.error("Network error"); }
  };

  const userAction = async (id, action) => {
    const labels = { ban:"ban", block:"block", suspend:"suspend", unblock:"reactivate" };
    if (!confirm(`Are you sure you want to ${labels[action] || action} this user?`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (res.ok) { toast.success(`User ${action}${action.endsWith("e") ? "d" : "ed"}`); load(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Failed"); }
    } catch (err) { toast.error("Network error"); }
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    try {
      await fetch(`/api/users/${id}`, { method: "DELETE" });
      toast.success("Deleted"); load();
    } catch (err) { toast.error("Network error"); }
  };

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.name || "").toLowerCase().includes(q) || (u.phone || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-3">
        <h2 className="text-2xl font-extrabold font-display">All Users ({filtered.length})</h2>
        <div className="flex gap-2 flex-wrap">
          {["all", "approved", "pending", "rejected", "banned", "blocked", "suspended"].map((f) => (
            <Button key={f} variant={filter === f ? "primary" : "outline"} sm onClick={() => setFilter(f)}>{f}</Button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text" placeholder="Search by name, phone, or email..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-dark-slate/30 border border-dark-slate/50 text-sm text-smoke placeholder-steel focus:outline-none focus:border-brand-green/50"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-slate/30">
              {["Name", "Phone", "Package", "Ref #", "Betting ID", "Revenue", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-steel text-[10px] font-bold tracking-widest uppercase font-display">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const gp = u.gamePackages || {};
              const firstGame = Object.values(gp)[0];
              const pkg = firstGame ? PACKAGES.find((p) => p.id === firstGame.package) : null;
              const rev = SIGNUP_FEE + (pkg?.price || 0);
              return (
                <tr key={u._id} className="border-b border-dark-slate/15 hover:bg-dark-slate/10 transition-colors">
                  <td className="px-3 py-3 font-semibold">{u.name}</td>
                  <td className="px-3 py-3 text-steel">{u.phone}</td>
                  <td className="px-3 py-3"><Badge color={pkg?.id === "diamond" ? "diamond" : pkg?.id === "platinum" ? "platinum" : "gold"}>{pkg?.name || "—"}</Badge></td>
                  <td className="px-3 py-3 font-mono text-[11px] text-steel">{u.referenceNumber}</td>
                  <td className="px-3 py-3 text-brand-green text-xs">{u.bettingId}</td>
                  <td className="px-3 py-3 text-brand-green font-bold">{fmtUSD(rev)}</td>
                  <td className="px-3 py-3"><Badge color={STATUS_COLORS[u.status] || "red"}>{u.status}</Badge></td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {u.status === "pending" && <Button variant="green" sm onClick={() => approve(u._id)}>Approve</Button>}
                      {["approved", "pending"].includes(u.status) && <Button variant="outline" sm onClick={() => userAction(u._id, "suspend")}>Suspend</Button>}
                      {!["banned"].includes(u.status) && <Button variant="outline" sm onClick={() => userAction(u._id, "ban")}>Ban</Button>}
                      {!["blocked"].includes(u.status) && u.status !== "banned" && <Button variant="outline" sm onClick={() => userAction(u._id, "block")}>Block</Button>}
                      {["banned", "blocked", "suspended", "rejected"].includes(u.status) && <Button variant="green" sm onClick={() => userAction(u._id, "unblock")}>Reactivate</Button>}
                      <Button variant="danger" sm onClick={() => deleteUser(u._id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-8 text-steel">No users found.</div>}
      </div>
    </div>
  );
}
