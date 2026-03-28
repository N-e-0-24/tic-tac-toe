import { useEffect, useState } from "react";
import type { LeaderboardEntry, PlayerStats } from "../hooks/useNakama";

interface Props {
  username: string;
  onBack: () => void;
  fetchLeaderboard: () => Promise<LeaderboardEntry[]>;
  fetchMyStats: () => Promise<PlayerStats>;
}

export default function LeaderboardScreen({ username, onBack, fetchLeaderboard, fetchMyStats }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [lb, stats] = await Promise.all([fetchLeaderboard(), fetchMyStats()]);
      setEntries(lb);
      setMyStats(stats);
      setLoading(false);
    }
    load();
  }, []);

  const total = myStats ? myStats.wins + myStats.losses + myStats.draws : 0;
  const winRate = total > 0 ? Math.round((myStats!.wins / total) * 100) : 0;

  const medalColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-slate-300";
    if (rank === 3) return "text-amber-600";
    return "text-white/30";
  };

  const medalLabel = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8 gap-5">

      {/* Header */}
      <div className="w-full max-w-sm anim-slide-up">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="glass border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-white/50 hover:text-white text-sm transition-all duration-200"
          >
            ← Back
          </button>
          <h1 className="text-xl font-black text-gradient flex-1 text-center pr-12">Leaderboard</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-white/10 border-t-violet-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Personal stats */}
          {myStats && (
            <div className="w-full max-w-sm anim-slide-up">
              <div className="glass-md rounded-3xl p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center">
                    <span className="text-sm font-black text-gradient">{username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{username}</p>
                    <p className="text-white/30 text-xs">{total} game{total !== 1 ? "s" : ""} played · {winRate}% win rate</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
                    <p className="text-emerald-400 text-xl font-black">{myStats.wins}</p>
                    <p className="text-white/30 text-xs mt-0.5">Wins</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
                    <p className="text-red-400 text-xl font-black">{myStats.losses}</p>
                    <p className="text-white/30 text-xs mt-0.5">Losses</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 text-center">
                    <p className="text-white text-xl font-black">{myStats.draws}</p>
                    <p className="text-white/30 text-xs mt-0.5">Draws</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top players */}
          <div className="w-full max-w-sm anim-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="glass-md rounded-3xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <p className="text-white/50 text-xs tracking-widest font-semibold">TOP PLAYERS · WINS</p>
              </div>
              {entries.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-white/25 text-sm">No games played yet.</p>
                  <p className="text-white/15 text-xs mt-1">Be the first to get on the board!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {entries.map((entry) => (
                    <div
                      key={entry.ownerId}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                        entry.rank === 1 ? "bg-yellow-500/[0.04]" : ""
                      }`}
                    >
                      <span className={`text-base font-black w-7 text-center shrink-0 ${medalColor(entry.rank)}`}>
                        {medalLabel(entry.rank)}
                      </span>
                      <p className="text-white text-sm font-medium flex-1 truncate">{entry.username}</p>
                      <div className="text-right shrink-0">
                        <p className="text-white text-sm font-bold">{entry.score}</p>
                        <p className="text-white/25 text-xs">wins</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
