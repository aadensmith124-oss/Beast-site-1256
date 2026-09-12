import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGames } from "@/hooks/use-games";
import { useAuth } from "@/hooks/use-auth";
import { Dice5, Bomb, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

export default function GamesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  if (!user) return <div className="p-8 text-center">Please login to play.</div>;

  const games = [
    {
      id: "dice",
      name: "DICE",
      description: "Double or nothing. Roll higher than 7 to win 2x your bet.",
      icon: Dice5,
      color: "from-primary/20 to-primary/5",
      iconColor: "text-primary"
    },
    {
      id: "mines",
      name: "MINES",
      description: "Cross the minefield without exploding. Higher difficulty = higher multiplier.",
      icon: Bomb,
      color: "from-destructive/20 to-destructive/5",
      iconColor: "text-destructive"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl md:text-6xl text-white">
          GAMBLE
        </h1>
        <p className="text-muted-foreground text-sm font-bold">Test your luck and win credits</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {games.map((game) => (
          <Card 
            key={game.id} 
            className={cn(
              "bg-[#111] border-white/10 hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden",
              "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-0 group-hover:before:opacity-100 before:transition-opacity",
              game.id === 'dice' ? "before:from-primary/10 before:to-transparent" : "before:from-destructive/10 before:to-transparent"
            )}
            onClick={() => setLocation(`/games/${game.id}`)}
          >
            <CardContent className="p-8 flex flex-col items-center text-center relative z-10">
              <div className={cn("p-4 rounded-2xl bg-black/40 mb-6 group-hover:scale-110 transition-transform", game.iconColor)}>
                <game.icon className="h-12 w-12" />
              </div>
              <h2 className="text-3xl text-white mb-2 group-hover:text-primary transition-colors">
                {game.name}
              </h2>
              <p className="text-muted-foreground text-sm max-w-[250px]">
                {game.description}
              </p>
              
              <Button className="mt-8 bg-[#111]/5 hover:bg-primary hover:text-white text-white font-bold border border-white/10">
                Play Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DiceGame() {
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
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="text-center border-b border-border bg-secondary/20">
        <CardTitle>Double or Nothing</CardTitle>
        <CardDescription>Roll higher than 7 to win 2x your bet.</CardDescription>
      </CardHeader>
      <CardContent className="p-8 flex flex-col items-center gap-8">
        <div className="h-32 flex items-center gap-4">
          <AnimatePresence mode="wait">
            {result ? (
              <>
                <motion.div 
                  initial={{ rotate: -180, scale: 0 }} 
                  animate={{ rotate: 0, scale: 1 }} 
                  className="w-24 h-24 bg-primary rounded-xl flex items-center justify-center text-4xl font-bold text-black shadow-lg shadow-primary/50"
                >
                  {result.roll[0]}
                </motion.div>
                <motion.div 
                  initial={{ rotate: 180, scale: 0 }} 
                  animate={{ rotate: 0, scale: 1 }} 
                  transition={{ delay: 0.1 }}
                  className="w-24 h-24 bg-primary rounded-xl flex items-center justify-center text-4xl font-bold text-black shadow-lg shadow-primary/50"
                >
                  {result.roll[1]}
                </motion.div>
              </>
            ) : (
              <div className="text-6xl text-muted-foreground opacity-20">? ?</div>
            )}
          </AnimatePresence>
        </div>

        {result && (
          <div className={`text-2xl font-bold ${result.won ? 'text-red-500' : 'text-red-500'}`}>
            {result.won ? `YOU WON $${(result.payout/100).toFixed(2)}!` : 'YOU LOST'}
          </div>
        )}

        <div className="flex gap-4 w-full max-w-sm">
          <Input 
            type="number" 
            value={bet/100} 
            onChange={(e) => setBet(parseFloat(e.target.value) * 100)} 
            className="text-center font-mono text-lg"
          />
          <Button 
            size="lg" 
            className="w-full bg-primary hover:bg-primary/80 font-bold" 
            onClick={handleRoll}
            disabled={playDice.isPending}
          >
            {playDice.isPending ? <Loader2 className="animate-spin" /> : "ROLL"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MinesGame() {
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
    <Card className="border-destructive/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="text-center border-b border-border bg-secondary/20">
        <CardTitle>Minefield</CardTitle>
        <CardDescription>Cross the field without hitting a mine.</CardDescription>
      </CardHeader>
      <CardContent className="p-8 flex flex-col items-center gap-8">
        <div className="grid grid-cols-5 gap-2">
          {result ? (
            result.grid.map((cell, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  "w-12 h-12 rounded-md flex items-center justify-center font-bold text-lg shadow-sm",
                  cell === 1 
                    ? "bg-destructive text-white" 
                    : "bg-red-500/20 text-red-500 border border-red-500/50"
                )}
              >
                {cell === 1 ? <Bomb className="h-6 w-6" /> : "SAFE"}
              </motion.div>
            ))
          ) : (
             Array(25).fill(0).map((_, i) => (
               <div key={i} className="w-12 h-12 rounded-md bg-secondary/50 border border-border" />
             ))
          )}
        </div>

        {result && (
           <div className={`text-2xl font-bold ${result.won ? 'text-red-500' : 'text-destructive'}`}>
            {result.won ? `CLEARED! +$${(result.payout/100).toFixed(2)}` : 'EXPLODED!'}
          </div>
        )}

        <div className="flex flex-col gap-4 w-full max-w-sm">
           <div className="grid grid-cols-3 gap-2">
             {(['simple', 'extreme', 'impossible'] as const).map(d => (
               <Button 
                key={d} 
                variant={difficulty === d ? 'default' : 'outline'} 
                onClick={() => setDifficulty(d)}
                className="capitalize"
               >
                 {d}
               </Button>
             ))}
           </div>
           <div className="flex gap-2">
              <Input 
                type="number" 
                value={bet/100} 
                onChange={(e) => setBet(parseFloat(e.target.value) * 100)} 
                className="text-center font-mono text-lg"
              />
              <Button 
                size="lg" 
                className="flex-1 bg-destructive hover:bg-destructive/80 font-bold" 
                onClick={handlePlay}
                disabled={playMines.isPending}
              >
                {playMines.isPending ? <Loader2 className="animate-spin" /> : "START"}
              </Button>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}

