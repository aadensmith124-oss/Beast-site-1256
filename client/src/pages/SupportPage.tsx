import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Send, Clock, CheckCircle2, RefreshCw, TicketCheck } from "lucide-react";

type Ticket = {
  id: number;
  orderId: string;
  subject: string;
  description: string;
  imageUrl: string;
  status: "open" | "refunded" | "replaced" | "resolved";
  adminMessage: string | null;
  createdAt: string;
};

function StatusBadge({ status }: { status: Ticket["status"] }) {
  const map = {
    open:     { label: "Open",     cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
    refunded: { label: "Refunded", cls: "bg-red-500/15 text-red-400 border-red-500/20" },
    replaced: { label: "Replaced", cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    resolved: { label: "Resolved", cls: "bg-white/8 text-white/50 border-white/10" },
  };
  const s = map[status] ?? map.open;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${s.cls}`}>{s.label}</span>
  );
}

export default function SupportPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"submit" | "history">("submit");

  // form state
  const [agreed, setAgreed] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [issue, setIssue] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const { data: tickets, isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/support"],
    staleTime: 30000,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!orderId.trim()) throw new Error("Order ID is required");
      if (!issue) throw new Error("Please select an issue type");
      if (!description.trim()) throw new Error("Please provide a description");
      const res = await apiRequest("POST", "/api/support", {
        orderId: orderId.trim(),
        subject: issue,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/support"] });
      toast({ title: "Ticket submitted", description: "Our team will review it shortly." });
      setOrderId("");
      setIssue("");
      setDescription("");
      setImageUrl("");
      setAgreed(false);
      setTab("history");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          {(["submit", "history"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold tracking-wide transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {t === "submit" ? "Submit Ticket" : "History"}
            </button>
          ))}
        </div>

        {/* ── Submit Ticket ── */}
        {tab === "submit" && (
          <div className="space-y-5">
            {/* Instructions */}
            <div className="bg-[#111] border border-white/10 rounded p-4 space-y-3">
              <h2 className="text-sm font-bold text-white">How to submit a ticket?</h2>
              <ul className="text-xs text-white/60 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Copy your Order ID from the <span className="text-primary">Orders</span> page.</li>
                <li>Select the issue type — Refund or Replace.</li>
                <li>Describe the problem in full detail.</li>
                <li>Optionally attach an image link (imgur, etc.).</li>
                <li>Submit and wait for our team to respond.</li>
              </ul>

              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-primary w-4 h-4 shrink-0"
                />
                <span className="text-xs text-white/70">I've read the instructions and fully understand</span>
              </label>
            </div>

            {/* Form — only enabled after checkbox */}
            <fieldset disabled={!agreed} className="space-y-4 disabled:opacity-40 disabled:pointer-events-none transition-opacity">
              {/* Order ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Order ID</label>
                <input
                  type="text"
                  placeholder="e.g. ORD-12345"
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  className="w-full h-11 bg-[#1a1a1a] border border-white/10 rounded px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/40 transition-colors"
                />
              </div>

              {/* Issue */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Issue Type</label>
                <select
                  value={issue}
                  onChange={e => setIssue(e.target.value)}
                  className="w-full h-11 bg-[#1a1a1a] border border-white/10 rounded px-3 text-sm text-white outline-none focus:border-primary/40 transition-colors appearance-none"
                >
                  <option value="" disabled>Select an issue...</option>
                  <option value="Refund">Refund</option>
                  <option value="Replace">Replace</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Description</label>
                <textarea
                  placeholder="Describe your issue in detail..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/40 transition-colors resize-none"
                />
              </div>

              {/* Image URL (optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase tracking-widest">
                  Image URL <span className="text-white/30 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://imgur.com/..."
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full h-11 bg-[#1a1a1a] border border-white/10 rounded px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/40 transition-colors"
                />
              </div>

              {/* Submit */}
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="w-full py-3 rounded bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {submitMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                  : <><Send className="h-4 w-4" /> Submit Ticket</>}
              </button>
            </fieldset>
          </div>
        )}

        {/* ── History ── */}
        {tab === "history" && (
          <div className="space-y-3">
            {ticketsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !tickets?.length ? (
              <div className="text-center py-16 space-y-3">
                <TicketCheck className="h-10 w-10 text-white/15 mx-auto" />
                <p className="text-sm text-white/40">You don't have any tickets yet</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <div key={ticket.id} className="bg-[#111] border border-white/10 rounded p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-white/50">{ticket.orderId}</p>
                      <p className="text-sm font-semibold text-white mt-0.5">{ticket.subject}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{ticket.description}</p>
                  {ticket.imageUrl && (
                    <a href={ticket.imageUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline">View image</a>
                  )}
                  {ticket.adminMessage && (
                    <div className="mt-2 bg-white/5 rounded px-3 py-2 border border-white/8">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Admin response</p>
                      <p className="text-xs text-white/70">{ticket.adminMessage}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-white/25">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/8 py-6 px-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-5 text-xs font-semibold text-white/50 tracking-widest uppercase">
          <span>Reviews</span>
          <a href="https://t.me/+3-lMkt-idutkOTIx" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center h-5 w-5 rounded-full bg-primary">
            <Send className="h-2.5 w-2.5 text-white fill-white" />
          </a>
          <span>TOS</span>
          <span>FAQs</span>
        </div>
        <p className="text-xs text-white/25">© 2026 TurtleCC. All rights reserved</p>
      </div>
    </div>
  );
}
