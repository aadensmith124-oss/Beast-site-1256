import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGames } from "@/hooks/use-games";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DiceGamePage() {
  const [bet, setBet] = useState(100);
  const { playDice } = useGames();
  const [result, setResult] = useState<{ roll: number[], won: boolean, payout: number } | null>(null);

  const handleRoll = () => {
    setResult(null);
    playDice.mutate(bet, {
      onSuccess: (data) => setResult(data)
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card className="border-primary/20 bg-[#0f1115] backdrop-blur-sm overflow-hidden">
        <CardHeader className="text-center border-b border-white/5 bg-[#111]/5">
          <CardTitle className="text-3xl font-black italic tracking-tighter uppercase text-white">Double or Nothing</CardTitle>
          <CardDescription className="italic">Roll higher than 7 to win 2x your bet.</CardDescription>
        </CardHeader>
        <CardContent className="p-12 flex flex-col items-center gap-12">
          <div className="h-32 flex items-center gap-6">
            <AnimatePresence mode="wait">
              {result ? (
                <>
                  <motion.div 
                    initial={{ rotate: -180, scale: 0 }} 
                    animate={{ rotate: 0, scale: 1 }} 
                    className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center text-4xl font-black text-black shadow-xl shadow-primary/30"
                  >
                    {result.roll[0]}
                  </motion.div>
                  <motion.div 
                    initial={{ rotate: 180, scale: 0 }} 
                    animate={{ rotate: 0, scale: 1 }} 
                    transition={{ delay: 0.1 }}
                    className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center text-4xl font-black text-black shadow-xl shadow-primary/30"
                  >
                    {result.roll[1]}
                  </motion.div>
                </>
              ) : (
                <div className="text-6xl text-white/10 font-black italic tracking-tighter uppercase select-none">ROLL DICE</div>
              )}
            </AnimatePresence>
          </div>

          {result && (
            <div className={`text-4xl font-black italic tracking-tighter uppercase ${result.won ? 'text-red-500' : 'text-red-500'}`}>
              {result.won ? `YOU WON $${(result.payout/100).toFixed(2)}!` : 'YOU LOST'}
            </div>
          )}

          <div className="flex flex-col gap-4 w-full max-w-sm">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold italic">$</span>
              <Input 
                type="number" 
                value={bet/100} 
                onChange={(e) => setBet(Math.max(1, parseFloat(e.target.value) * 100))} 
                className="pl-8 text-center font-mono text-xl bg-black/40 border-white/10 h-14"
              />
            </div>
            <Button 
              size="lg" 
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black italic tracking-tighter uppercase text-xl" 
              onClick={handleRoll}
              disabled={playDice.isPending}
            >
              {playDice.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "ROLL"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}