import { useState } from "react";
import { X } from "lucide-react";

const MENU = [
  { name: "Panda Express",           emoji: "🐼" },
  { name: "Smoothie King",           emoji: "🥤" },
  { name: "Jack in the Box",         emoji: "🍔" },
  { name: "Dairy Queen",             emoji: "🍦" },
  { name: "Insomnia Cookies",        emoji: "🍪" },
  { name: "Dominos Pizza",           emoji: "🍕" },
  { name: "Zaxbys",                  emoji: "🍗" },
  { name: "Applebees",               emoji: "🍽️" },
  { name: "Little Caesars",          emoji: "👑" },
  { name: "Raising Canes (Pick Up)", emoji: "🐔" },
  { name: "Papa Johns",              emoji: "🍕" },
  { name: "Wawa",                    emoji: "☕" },
  { name: "Sonic (Pick Up)",         emoji: "🌭" },
  { name: "Olive Garden",            emoji: "🫒" },
  { name: "Jersey Mikes",            emoji: "🥖" },
  { name: "Tropical Smoothie Café",  emoji: "🌴" },
  { name: "Subway",                  emoji: "🥙" },
  { name: "Chilis",                  emoji: "🌶️" },
  { name: "Buffalo Wild Wings",      emoji: "🦅" },
  { name: "Wingstop",                emoji: "🔥" },
  { name: "Firehouse Subs",          emoji: "🚒" },
  { name: "Pizza Hut",               emoji: "🏠" },
  { name: "Auntie Annes",            emoji: "🥨" },
];

export default function EatzPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const telegramUrl = selected ? "https://t.me/topcc_alias" : "#";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Header banner */}
        <div className="rounded-2xl bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 border border-orange-500/30 p-5 mb-6 text-center">
          <p className="text-[10px] text-orange-400/70 uppercase tracking-widest mb-1">limited time</p>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            GET <span className="text-orange-400">60% OFF</span> ALL EATS
          </h1>
          <p className="text-xs text-white/40 mt-2">Pick a restaurant below to place your order via Telegram</p>
        </div>

        {/* Menu grid */}
        <div className="grid grid-cols-2 gap-3">
          {MENU.map((item) => (
            <button
              key={item.name}
              onClick={() => setSelected(item.name)}
              className="flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-orange-500/30 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.97] group"
            >
              <span className="text-2xl flex-shrink-0">{item.emoji}</span>
              <span className="text-xs font-semibold text-white/80 group-hover:text-white leading-snug">{item.name}</span>
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-white/20 mt-8 px-4 leading-relaxed">
          Prices vary by location. All orders handled via Telegram.
        </p>
      </div>

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-sm font-bold text-foreground">{selected}</span>
              <button
                onClick={() => setSelected(null)}
                className="h-7 w-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Rules */}
            <div className="px-5 py-4 space-y-3">
              <div className="bg-white/[0.03] rounded-xl px-4 py-3 border border-white/10">
                <p className="text-xs font-bold text-white">Payment comes first</p>
                <p className="text-[11px] text-white/40 mt-0.5">Order is placed only after payment is confirmed.</p>
              </div>

              <div className="bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
                <p className="text-xs font-bold text-red-400">No time wasters</p>
                <p className="text-[11px] text-red-400/60 mt-0.5">Contact to waste time may result in a block.</p>
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold text-sm transition-colors active:scale-[0.98]"
              >
                <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
                Order via Telegram
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
