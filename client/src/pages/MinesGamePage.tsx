import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGames } from "@/hooks/use-games";
import { Bomb, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function MinesGamePage() {
  const [bet, setBet] = useState(100);
  const [difficulty, setDifficulty] = useState<"simple" | "extreme" | "impossible">("simple");
  const { playMines } = useGames();
  const [result, setResult] = useState<{ grid: number[], won: boolean, payout: number } | null>(null);

  const handlePlay = () => {
    setResult(null);
    playMines.mutate({ betAmount: bet, difficulty }, {
      onSuccess: (data) => setResult(data)
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card className="border-destructive/20 bg-[#0f1115] backdrop-blur-sm">
        <CardHeader className="text-center border-b border-white/5 bg-[#111]/5">
          <CardTitle className="text-3xl font-black italic tracking-tighter uppercase text-white">Minefield</CardTitle>
          <CardDescription className="italic">Cross the field without hitting a mine.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 flex flex-col items-center gap-12">
          <div className="grid grid-cols-5 gap-3 bg-black/20 p-4 rounded-2xl border border-white/5">
            {result ? (
              result.grid.map((cell, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center font-black text-xs shadow-lg",
                    cell === 1 
                      ? "bg-destructive text-white shadow-destructive/20" 
                      : "bg-red-500/10 text-red-500 border border-red-500/30"
                  )}
                >
                  {cell === 1 ? <Bomb className="h-6 w-6" /> : "SAFE"}
                </motion.div>
              ))
            ) : (
               Array(25).fill(0).map((_, i) => (
                 <div key={i} className="w-12 h-12 rounded-lg bg-[#111]/5 border border-white/5" />
               ))
            )}
          </div>

          {result && (
             <div className={`text-4xl font-black italic tracking-tighter uppercase ${result.won ? 'text-red-500' : 'text-destructive'}`}>
              {result.won ? `CLEARED! +$${(result.payout/100).toFixed(2)}` : 'EXPLODED!'}
            </div>
          )}

          <div className="flex flex-col gap-6 w-full max-w-sm">
             <div className="grid grid-cols-3 gap-2">
               {(['simple', 'extreme', 'impossible'] as const).map(d => (
                 <Button 
                  key={d} 
                  variant={difficulty === d ? 'default' : 'outline'} 
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "capitalize font-bold italic tracking-tighter",
                    difficulty === d ? "bg-destructive hover:bg-destructive/90 text-white" : "border-white/10 hover:bg-[#111]/5"
                  )}
                 >
                   {d}
                 </Button>
               ))}
             </div>
             <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold italic">$</span>
                  <Input 
                    type="number" 
                    min="1"
                    step="1"
                    value={bet/100} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setBet(Math.max(100, Math.round(val * 100)));
                    }} 
                    className="pl-8 text-center font-mono text-xl bg-black/40 border-white/10 h-14"
                  />
                </div>
                <Button 
                  size="lg" 
                  className="w-32 h-14 bg-destructive hover:bg-destructive/90 text-white font-black italic tracking-tighter uppercase text-xl" 
                  onClick={handlePlay}
                  disabled={playMines.isPending}
                >
                  {playMines.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "START"}
                </Button>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}