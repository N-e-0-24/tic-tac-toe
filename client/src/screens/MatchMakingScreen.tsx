import { useEffect, useState } from "react";
import type { GameMode } from "../hooks/useNakama";

interface Props {
  onCancel: () => void;
  gameMode: GameMode;
}

export default function MatchmakingScreen({ onCancel, gameMode }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 450);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6 anim-slide-up">

        {/* Radar */}
        <div className="flex justify-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Expanding rings */}
            <div className="absolute inset-0 rounded-full border border-violet-500/40 anim-radar" />
            <div className="absolute inset-0 rounded-full border border-violet-400/25 anim-radar-d1" />
            <div className="absolute inset-0 rounded-full border border-violet-300/15 anim-radar-d2" />

            {/* Center orb */}
            <div className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center glass-md border border-violet-500/25 anim-glow-pulse">
              <span className="font-mono text-sm font-bold text-white/80">{fmt(seconds)}</span>
            </div>

            {/* X dot */}
            <div className="absolute top-2 right-4 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg"
              style={{ boxShadow: "0 0 14px rgba(129,140,248,0.7)" }}>
              <span className="text-xs font-black text-white">X</span>
            </div>

            {/* O dot */}
            <div className="absolute bottom-2 left-4 w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center shadow-lg"
              style={{ boxShadow: "0 0 14px rgba(244,114,182,0.7)" }}>
              <span className="text-xs font-black text-white">O</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="glass-md rounded-3xl p-8 space-y-5 text-center">
          <div className="space-y-1.5">
            <h2 className="text-white text-xl font-bold tracking-tight">
              Searching{dots}
            </h2>
            <p className="text-white/35 text-sm">Looking for an opponent</p>
          </div>

          {/* Mode badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            gameMode === "timed"
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
              : "bg-violet-500/15 border border-violet-500/30 text-violet-300"
          }`}>
            {gameMode === "timed" ? "⏱ Timed Mode · 15s per turn" : "♟ Classic Mode"}
          </div>

          {/* Tip */}
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl px-4 py-3.5 text-left">
            <p className="text-violet-300 text-xs leading-relaxed">
              <span className="font-semibold text-violet-200">Testing locally?</span>{" "}
              Open another browser at{" "}
              <span className="font-mono bg-violet-500/20 px-1.5 py-0.5 rounded text-violet-200">localhost:5173</span>{" "}
              and click Find Match.
            </p>
          </div>

          <button
            onClick={onCancel}
            className="w-full glass border border-white/10 hover:border-white/20 rounded-2xl py-3.5 text-white/50 hover:text-white text-sm font-medium transition-all duration-200"
          >
            Cancel Search
          </button>
        </div>
      </div>
    </div>
  );
}
