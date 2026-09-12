import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { ShoppingCart, ArrowRight, Loader2, Wallet, Copy, X, Clock, Tag, Check } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { SiCashapp, SiBitcoin } from "react-icons/si";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

type PaymentMethod = "balance" | "cashapp" | "crypto";

interface AppliedDiscount {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  discountAmount: number;
}

function CashAppModal({ orderId, total, paymentNote, cashappTag, onClose }: {
  orderId: string;
  total: number;
  paymentNote: string;
  cashappTag: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val).then(() => toast({ title: `${label} copied` }));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SiCashapp className="h-5 w-5 text-[#00D632]" />
            <span className="text-sm text-white">CashApp Payment</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-white/45 leading-relaxed">
          Send the exact amount below to the CashApp tag. You <strong className="text-white">must</strong> include the note — it's how we match your order.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between bg-[#0d0d0d] rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[10px] text-white/45 mb-0.5">Send to</p>
              <p className="text-sm font-bold text-[#ff2d2d]">{cashappTag || "$YourCashTag"}</p>
            </div>
            <button onClick={() => copy(cashappTag, "CashApp tag")} className="text-white/40 hover:text-white transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between bg-[#0d0d0d] rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[10px] text-white/45 mb-0.5">Amount</p>
              <p className="text-sm font-bold text-white">${(total / 100).toFixed(2)}</p>
            </div>
            <button onClick={() => copy((total / 100).toFixed(2), "Amount")} className="text-white/40 hover:text-white transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[10px] text-primary/70 mb-0.5">Note (required)</p>
              <p className="text-sm font-bold text-primary font-mono">{paymentNote}</p>
            </div>
            <button onClick={() => copy(paymentNote, "Note")} className="text-primary/50 hover:text-primary transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-[#0d0d0d] rounded-xl px-3 py-2.5">
          <Clock className="h-3.5 w-3.5 text-white/45 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/45 leading-relaxed">
            Order <span className="text-white font-mono">{orderId}</span> is pending. It takes <strong className="text-white">up to 4 hours</strong> to be pushed after payment. If not received, contact support.
          </p>
        </div>

        <button
          className="w-full h-9 rounded-xl bg-[#ff2d2d] hover:bg-[#d90000] text-white text-xs font-bold transition-colors"
          onClick={onClose}
        >
          Done — I've sent it
        </button>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cashapp");
  const [cashappModal, setCashappModal] = useState<{ orderId: string; total: number; paymentNote: string; cashappTag: string } | null>(null);

  const cartTotal = total();
  const discountAmount = appliedDiscount?.discountAmount ?? 0;
  const discountedTotal = Math.max(0, cartTotal - discountAmount);
  const userBalance = user?.balance || 0;

  const { data: rankData } = useQuery<any>({ queryKey: ["/api/user/rank"], enabled: !!user });
  const rankDiscountPct = rankData?.discountPct ?? 0;
  const rankDiscountAmount = rankDiscountPct > 0 ? Math.round(discountedTotal * rankDiscountPct / 100) : 0;
  const finalTotal = Math.max(0, discountedTotal - rankDiscountAmount);

  const hasEnoughBalance = userBalance >= finalTotal;

  const { data: enabledMethods } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/payment-methods"],
  });
  const cashappEnabled = enabledMethods?.cashapp !== false;
  const walletEnabled = enabledMethods?.wallet !== false;
  const cryptoEnabled = enabledMethods?.crypto !== false;

  const { data: manualMethods } = useQuery<{
    cashapp: { enabled: boolean; tag: string; fee: number };
  }>({ queryKey: ["/api/site-settings/manual-payments"] });

  const feePercentFor = (m: PaymentMethod) => m === "cashapp" ? (manualMethods?.cashapp?.fee ?? 0) : 0;

  useEffect(() => {
    if (selectedMethod === "cashapp" && !cashappEnabled) {
      setSelectedMethod(walletEnabled ? "balance" : cryptoEnabled ? "crypto" : "balance");
    }
    if (selectedMethod === "balance" && !walletEnabled) {
      setSelectedMethod(cashappEnabled ? "cashapp" : cryptoEnabled ? "crypto" : "balance");
    }
    if (selectedMethod === "crypto" && !cryptoEnabled) {
      setSelectedMethod(walletEnabled ? "balance" : cashappEnabled ? "cashapp" : "balance");
    }
  }, [cashappEnabled, walletEnabled, cryptoEnabled, selectedMethod]);

  // Clear discount if cart changes
  useEffect(() => {
    if (appliedDiscount) setAppliedDiscount(null);
  }, [cartTotal]);

  const validateDiscountMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/discount/validate", { code, cartTotal });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Invalid code");
      }
      return res.json();
    },
    onSuccess: (data: AppliedDiscount) => {
      setAppliedDiscount(data);
      setCouponCode("");
      const label = data.type === "percent" ? `${data.value}% off` : `$${(data.value / 100).toFixed(2)} off`;
      toast({ title: `Discount applied — ${label}`, description: `You save $${(data.discountAmount / 100).toFixed(2)}` });
    },
    onError: (e: any) => {
      toast({ title: "Code not valid", description: e.message, variant: "destructive" });
    },
  });

  const processorFeePercent = selectedMethod === "balance" ? 0 : feePercentFor(selectedMethod);
  const processorFee = Math.round(finalTotal * processorFeePercent / 100);
  const dueTotal = finalTotal + processorFee;

  const cashappOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItems = items.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
      const res = await apiRequest("POST", "/api/orders/cashapp", {
        items: cartItems,
        discountCodeId: appliedDiscount?.id ?? null,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Order failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      clearCart();
      setCashappModal({
        orderId: data.order?.orderId || data.orderId || "N/A",
        total: data.order?.total ?? dueTotal,
        paymentNote: data.paymentNote || data.order?.orderId || "",
        cashappTag: data.cashappTag || "",
      });
    },
    onError: (e: any) => {
      toast({ title: "Checkout failed", description: e.message || "Could not create order.", variant: "destructive" });
    },
  });

  const balanceOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItems = items.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
      const res = await apiRequest("POST", api.orders.create.path, {
        items: cartItems,
        discountCodeId: appliedDiscount?.id ?? null,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Order failed");
      }
      return res.json();
    },
    onSuccess: () => {
      clearCart();
      toast({ title: "Order placed!", description: "Your order has been placed and will be fulfilled soon." });
      setLocation("/orders");
    },
    onError: (e: any) => {
      toast({ title: "Checkout failed", description: e.message || "Could not create order.", variant: "destructive" });
    },
  });

  const cryptoOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItems = items.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
      const res = await apiRequest("POST", "/api/orders/crypto", {
        items: cartItems,
        discountCodeId: appliedDiscount?.id ?? null,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Order failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      clearCart();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (e: any) => {
      toast({ title: "Checkout failed", description: e.message || "Could not create order.", variant: "destructive" });
    },
  });

  const isPending = cashappOrderMutation.isPending || balanceOrderMutation.isPending || cryptoOrderMutation.isPending;

  const handleCheckout = () => {
    if (!user) return setLocation("/auth");
    if (selectedMethod === "balance") {
      if (!hasEnoughBalance) {
        toast({ title: "Insufficient balance", description: `You need $${(finalTotal / 100).toFixed(2)} but have $${(userBalance / 100).toFixed(2)}.`, variant: "destructive" });
        return;
      }
      balanceOrderMutation.mutate();
    } else if (selectedMethod === "cashapp") {
      cashappOrderMutation.mutate();
    } else if (selectedMethod === "crypto") {
      cryptoOrderMutation.mutate();
    }
  };

  const handleApplyCoupon = () => {
    const trimmed = couponCode.trim();
    if (!trimmed) return;
    if (!user) { toast({ title: "Sign in to apply a discount code", variant: "destructive" }); return; }
    validateDiscountMutation.mutate(trimmed);
  };

  if (items.length === 0 && !cashappModal) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 max-w-sm mx-auto text-center">
        <div className="h-20 w-20 rounded-full bg-[#0d0d0d] flex items-center justify-center">
          <ShoppingCart className="h-9 w-9 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground">Add some products to get started.</p>
        </div>
        <Link href="/">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold" data-testid="button-browse-shop">
            Browse Shop <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {cashappModal && (
        <CashAppModal
          orderId={cashappModal.orderId}
          total={cashappModal.total}
          paymentNote={cashappModal.paymentNote}
          cashappTag={cashappModal.cashappTag}
          onClose={() => { setCashappModal(null); setLocation("/orders"); }}
        />
      )}

      <div className="max-w-lg mx-auto w-full space-y-4 pb-20">

        {/* Products header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Products ({items.length})</h2>
          <span className="text-[11px] text-white/40">Swipe/scroll to view each product</span>
        </div>

        {/* Product list */}
        <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden divide-y divide-gray-100">
          {items.map((item) => (
            <div key={`v-${item.variantId}`} className="flex items-center gap-3 px-3 py-3" data-testid={`card-cart-item-${item.variantId}`}>
              <div className="h-10 w-10 rounded-lg bg-[#111]/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.image ? (
                  <img src={item.image} alt={item.productName} className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-sm font-bold text-white/45">{item.productName?.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/90 leading-tight truncate">{item.productName}</p>
                <p className="text-[11px] text-white/45 mt-0.5">{item.variantName} · Qty: {item.quantity}</p>
                <p className="text-xs font-bold text-primary mt-0.5">${((item.price * item.quantity) / 100).toFixed(2)}</p>
              </div>
              <button
                onClick={() => removeItem(item.variantId)}
                className="flex-shrink-0 px-2.5 py-1 rounded border border-red-500/40 text-red-400 text-[11px] font-semibold hover:bg-red-500/10 transition-colors"
                data-testid={`button-remove-item-${item.variantId}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Coupon input */}
        <div className="space-y-2">
          {appliedDiscount ? (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-bold text-primary">{appliedDiscount.code}</p>
                  <p className="text-[10px] text-primary/60">
                    {appliedDiscount.type === "percent" ? `${appliedDiscount.value}% off` : `$${(appliedDiscount.value / 100).toFixed(2)} off`}
                    {" · "}saves ${(appliedDiscount.discountAmount / 100).toFixed(2)}
                  </p>
                </div>
              </div>
              <button onClick={() => setAppliedDiscount(null)} className="text-white/40 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Enter discount code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                className="flex-1 bg-[#111] border-white/10 text-white placeholder:text-white/40 text-xs h-10 focus-visible:ring-primary/30"
                data-testid="input-coupon"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={validateDiscountMutation.isPending || !couponCode.trim()}
                className="px-4 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                data-testid="button-apply-coupon"
              >
                {validateDiscountMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Checkout summary */}
        <div className="bg-[#111] border border-white/10 rounded-xl p-4 space-y-0">
          <h3 className="text-base font-bold text-white mb-3">User Checkout</h3>

          <div className="space-y-0 divide-y divide-white/[0.04]">
            <div className="flex justify-between py-2.5 text-xs">
              <span className="text-white/60">Subtotal</span>
              <span className="text-white font-bold">${(cartTotal / 100).toFixed(2)}</span>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between py-2.5 text-xs">
                <span className="text-primary/80 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Discount ({appliedDiscount.code})
                </span>
                <span className="text-primary font-bold">-${(discountAmount / 100).toFixed(2)}</span>
              </div>
            )}
            {rankDiscountAmount > 0 && (
              <div className="flex justify-between py-2.5 text-xs">
                <span className="text-amber-400/80 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Rank discount ({rankDiscountPct}% · {rankData?.rank?.toUpperCase()})
                </span>
                <span className="text-amber-400 font-bold">-${(rankDiscountAmount / 100).toFixed(2)}</span>
              </div>
            )}
            {processorFee > 0 && (
              <div className="flex justify-between py-2.5 text-xs">
                <span className="text-white/50">Processing fee ({processorFeePercent}%)</span>
                <span className="text-white/70 font-bold">+${(processorFee / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2.5 text-xs font-bold">
              <span className="text-white">Total</span>
              <span className="text-white">${(dueTotal / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment processor */}
        <div>
          <p className="text-xs font-semibold text-white/60 mb-2">Select Payment Processor</p>
          <div className="space-y-1.5">
            {cashappEnabled && (
              <button
                onClick={() => setSelectedMethod("cashapp")}
                data-testid="button-payment-cashapp"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  selectedMethod === "cashapp"
                    ? "border-white/15 bg-[#0d0d0d]"
                    : "border-white/10 bg-[#111] hover:border-white/10"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedMethod === "cashapp" ? "border-primary" : "border-white/15"}`}>
                  {selectedMethod === "cashapp" && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <SiCashapp className="h-4 w-4 text-[#00D632] flex-shrink-0" />
                <span className="flex-1 text-left text-xs font-bold text-white">CashApp</span>
                <span className="text-[11px] font-semibold text-white/45">
                  {feePercentFor("cashapp") > 0 ? `${feePercentFor("cashapp")}% Fee` : "0% Fee"}
                </span>
              </button>
            )}

            {cryptoEnabled && (
              <button
                onClick={() => setSelectedMethod("crypto")}
                data-testid="button-payment-crypto"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  selectedMethod === "crypto"
                    ? "border-white/15 bg-[#0d0d0d]"
                    : "border-white/10 bg-[#111] hover:border-white/10"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedMethod === "crypto" ? "border-primary" : "border-white/15"}`}>
                  {selectedMethod === "crypto" && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <SiBitcoin className="h-4 w-4 text-[#f7931a] flex-shrink-0" />
                <span className="flex-1 text-left text-xs font-bold text-white">Crypto</span>
                <span className="text-[11px] font-semibold text-white/45">0% Fee</span>
              </button>
            )}

            {walletEnabled && (
              <button
                onClick={() => setSelectedMethod("balance")}
                data-testid="button-payment-balance"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  selectedMethod === "balance"
                    ? "border-white/15 bg-[#0d0d0d]"
                    : "border-white/10 bg-[#111] hover:border-white/10"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedMethod === "balance" ? "border-primary" : "border-white/15"}`}>
                  {selectedMethod === "balance" && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <Wallet className="h-4 w-4 text-white/45 flex-shrink-0" />
                <span className="flex-1 text-left text-xs font-bold text-white">Balance</span>
                <span className="text-[11px] font-semibold text-white/45">0% Fee</span>
                <span className={`text-[11px] font-semibold ${hasEnoughBalance ? "text-primary" : "text-red-400"}`}>
                  You have ${(userBalance / 100).toFixed(2)}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Proceed to Payment */}
        <button
          className="w-full h-9 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 uppercase tracking-widest flex items-center justify-center gap-2"
          disabled={isPending}
          onClick={handleCheckout}
          data-testid="button-proceed-payment"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Proceed to Payment
        </button>

      </div>
    </>
  );
}
