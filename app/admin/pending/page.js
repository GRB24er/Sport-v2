"use client";

import { useState, useEffect } from "react";
import { Card, Button, Badge, EmptyState, Loading } from "@/components/ui";
import { PACKAGES, SIGNUP_FEE, fmtUSD } from "@/lib/constants";
import toast from "react-hot-toast";

export default function PendingPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proofImg, setProofImg] = useState(null);

  const load = () => {
    fetch("/api/users?status=pending")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    try {
      const res = await fetch("/api/users/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id }) });
      if (res.ok) { toast.success("User approved!"); load(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Failed to approve user"); }
    } catch (err) { toast.error("Network error approving user"); }
  };

  const reject = async (id) => {
    try {
      const res = await fetch("/api/users/reject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id }) });
      if (res.ok) { toast.success("User rejected"); load(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Failed to reject user"); }
    } catch (err) { toast.error("Network error rejecting user"); }
  };

  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-extrabold font-display mb-5">Pending Payments ({users.length})</h2>

      {users.length === 0 ? (
        <EmptyState icon="✅" title="All caught up!" description="No pending payments to verify." />
      ) : users.map((u) => {
        const gp = u.pendingGamePackages || u.gamePackages || {};
        const firstGame = Object.values(gp)[0];
        const pkg = firstGame ? PACKAGES.find((p) => p.id === firstGame.package) : null;
        const total = SIGNUP_FEE + (pkg?.price || 0);
        return (
          <Card key={u._id} glow="red" className="mb-4">
            <div className="flex justify-between flex-wrap gap-4">
              <div>
                <div className="font-bold text-lg font-display mb-1">{u.name}</div>
                <div className="text-steel text-sm mb-0.5">Phone: <span className="text-smoke">{u.phone}</span></div>
                <div className="text-steel text-sm mb-0.5">Reference: <span className="text-brand-green font-bold font-mono">{u.referenceNumber}</span></div>
                <div className="text-steel text-sm mb-0.5">Package: <span className="font-bold" style={{ color: pkg?.color }}>{pkg?.icon} {pkg?.name} ({fmtUSD(pkg?.price || 0)})</span></div>
                <div className="text-steel text-sm mb-0.5">Total Expected: <span className="text-brand-green font-black">{fmtUSD(total)}</span></div>
                <div className="text-steel text-sm">Betting ID: <span className="text-smoke">{u.bettingId}</span></div>
                {u.referredBy && <div className="text-steel text-sm">Referred by: <span className="text-brand-gold">{u.referredBy}</span></div>}
                {u.paymentProofUrl && (
                  <div className="mt-2">
                    <div className="text-steel text-[11px] mb-1 font-bold uppercase tracking-wider">Payment Proof:</div>
                    <img src={u.paymentProofUrl} alt="Payment proof" onClick={() => setProofImg(u.paymentProofUrl)} style={{ width:80, height:80, objectFit:"cover", borderRadius:8, cursor:"pointer", border:"2px solid #1E2028" }} />
                  </div>
                )}
                <div className="text-steel text-[11px] mt-2">Submitted: {new Date(u.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="green" onClick={() => approve(u._id)}>✓ Verify & Approve</Button>
                <Button variant="danger" onClick={() => reject(u._id)}>✗ Reject</Button>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Proof Image Modal */}
      {proofImg && (
        <div onClick={() => setProofImg(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:20 }}>
          <img src={proofImg} alt="Payment proof" style={{ maxWidth:"90%", maxHeight:"85vh", borderRadius:12, objectFit:"contain" }} />
        </div>
      )}
    </div>
  );
}
