import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Filter, X, ShoppingCart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

function AchRow({ ach, inCart, onToggleCart }: { ach: any; inCart: boolean; onToggleCart: (a: any) => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ach/${ach.id}/purchase`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Purchase failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ach"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Purchase complete", description: "ACH delivered to your orders" });
      setLocation("/orders");
    },
    onError: (e: Error) => {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className={`border rounded mb-2 overflow-hidden transition-colors ${inCart ? "border-red-600/40 bg-[#111]" : "border-white/10 bg-[#111]"}`}>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-bold text-white font-mono uppercase tracking-wide">
              {ach.bankName}
            </p>
            <p className="text-xs text-white/40 font-mono">
              {ach.bankName} · Balance ${String(ach.balance).replace(/^\$/, "")}
            </p>
          </div>
          <p className="text-sm font-mono font-bold text-white flex-shrink-0">${(ach.price / 100).toFixed(2)}</p>
        </div>

        <div className="flex gap-1.5 pt-0.5">
          <button
            onClick={() => onToggleCart(ach)}
            className={`flex items-center gap-1.5 border rounded text-xs font-bold py-1.5 px-3 transition-all ${
              inCart
                ? "border-red-600/60 text-red-400 bg-red-900/20"
                : "border-white/10 text-white/50 hover:border-white/15 hover:text-white"
            }`}
            data-testid={`btn-cart-ach-${ach.id}`}
          >
            <ShoppingCart className="h-3 w-3" />
            {inCart ? "added" : "add"}
          </button>
          <button
            onClick={() => purchaseMutation.mutate()}
            disabled={purchaseMutation.isPending}
            className="flex-1 border border-red-600/60 text-red-400 rounded text-xs font-bold py-1.5 transition-all hover:bg-red-900/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
            data-testid={`btn-buy-ach-${ach.id}`}
          >
            {purchaseMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : `Buy $${(ach.price / 100).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AchPage() {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [cartIds, setCartIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: achList, isLoading } = useQuery<any[]>({ queryKey: ["/api/ach"] });

  const filtered = useMemo(() => {
    if (!achList) return [];
    return achList.filter((a: any) => {
      const matchSearch = !search
        || a.bankName?.toLowerCase().includes(search.toLowerCase())
        || a.balance?.toLowerCase().includes(search.toLowerCase());
      const priceDollars = a.price / 100;
      const matchPriceMin = !priceMin || priceDollars >= parseFloat(priceMin);
      const matchPriceMax = !priceMax || priceDollars <= parseFloat(priceMax);
      return matchSearch && matchPriceMin && matchPriceMax;
    });
  }, [achList, search, priceMin, priceMax]);

  const cartItems = useMemo(() => (achList ?? []).filter((a: any) => cartIds.has(a.id)), [achList, cartIds]);
  const cartTotal = cartItems.reduce((sum: number, a: any) => sum + a.price, 0);
  const activeFilters = (priceMin ? 1 : 0) + (priceMax ? 1 : 0);

  const toggleCart = (ach: any) => {
    setCartIds(prev => {
      const next = new Set(prev);
      if (next.has(ach.id)) next.delete(ach.id);
      else next.add(ach.id);
      return next;
    });
  };

  const purchaseCart = async () => {
    if (cartItems.length === 0) return;
    let purchased = 0;
    for (const ach of cartItems) {
      try {
        const res = await apiRequest("POST", `/api/ach/${ach.id}/purchase`, {});
        if (res.ok) purchased++;
        else {
          const err = await res.json().catch(() => ({}));
          toast({ title: `Failed: ${ach.bankName}`, description: err.message, variant: "destructive" });
        }
      } catch {
        toast({ title: `Failed: ${ach.bankName}`, variant: "destructive" });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/ach"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    setCartIds(new Set());
    if (purchased > 0) {
      toast({ title: `${purchased} ACH purchased`, description: "Check your orders" });
      setLocation("/orders");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-2">
      {/* Cart checkout bar */}
      {cartIds.size > 0 && (
        <div className="border border-red-600/30 bg-red-950/20 rounded px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-red-400">{cartIds.size} selected · ${(cartTotal / 100).toFixed(2)}</span>
          <button onClick={purchaseCart} className="text-[11px] text-red-400 font-bold hover:text-red-300">checkout →</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <input
          type="text"
          placeholder="Search bank, balance..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#111] border border-white/10 rounded py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-white/25 outline-none focus:border-white/10 transition-colors"
          data-testid="input-search-ach"
        />
      </div>

      {/* Filters toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`w-full border rounded py-2 text-xs transition-all flex items-center justify-center gap-2 ${
          showFilters || activeFilters > 0
            ? "border-primary/40 text-primary bg-primary/5"
            : "border-white/10 text-white/50 bg-[#111] hover:text-white hover:border-white/15"
        }`}
        data-testid="btn-ach-filters"
      >
        <Filter className="h-3 w-3" />
        filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
      </button>

      {showFilters && (
        <div className="border border-white/10 bg-[#111] rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Price Filter</p>
            <button
              onClick={() => { setPriceMin(""); setPriceMax(""); setShowFilters(false); }}
              className="text-[10px] text-white/30 hover:text-white flex items-center gap-1"
            >
              <X className="h-3 w-3" /> clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] text-white/30 uppercase tracking-widest">Min ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded py-1.5 px-2 text-xs text-white placeholder:text-white/20 outline-none"
                data-testid="input-ach-price-min" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-white/30 uppercase tracking-widest">Max ($)</label>
              <input type="number" step="0.01" placeholder="100.00" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded py-1.5 px-2 text-xs text-white placeholder:text-white/20 outline-none"
                data-testid="input-ach-price-max" />
            </div>
          </div>
        </div>
      )}

      {/* Add selected button */}
      <button
        onClick={purchaseCart}
        disabled={cartIds.size === 0}
        className="w-full border border-white/10 bg-[#111] rounded py-2 text-xs text-white/40 hover:text-white hover:border-white/15 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        data-testid="btn-add-selected-ach"
      >
        <ShoppingCart className="h-3 w-3" />
        add selected ({cartIds.size})
      </button>

      {/* List */}
      <div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-xs">No ACH available</div>
        ) : (
          filtered.map((ach: any) => (
            <AchRow key={ach.id} ach={ach} inCart={cartIds.has(ach.id)} onToggleCart={toggleCart} />
          ))
        )}
      </div>
    </div>
  );
}
