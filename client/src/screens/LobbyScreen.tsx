import type { GameMode } from "../hooks/useNakama";

interface Props {
  username: string;
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  onFindMatch: () => void;
  onLeaderboard: () => void;
  error: string;
}

export default function LobbyScreen({ username, gameMode, onGameModeChange, onFindMatch, onLeaderboard, error }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4 anim-slide-up">

        {/* Title */}
        <div className="text-center mb-1">
          <h1 className="text-2xl font-black text-gradient">Tic Tac Toe</h1>
        </div>

        {/* Profile + info card */}
        <div className="glass-md rounded-3xl p-7 space-y-6">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="anim-glow-pulse absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 opacity-70" />
              <div className="relative w-20 h-20 rounded-full bg-[#0d0d1f] flex items-center justify-center">
                <span className="text-3xl font-black text-gradient">{username.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg leading-tight">{username}</p>
              <p className="text-white/30 text-xs mt-0.5 tracking-wide">ONLINE · READY</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* X vs O */}
          <div className="flex items-center justify-center gap-6">
            <div className="text-center space-y-1">
              <span className="text-4xl font-black text-indigo-400 glow-x block">X</span>
              <p className="text-white/25 text-xs">Player 1</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-white/20 font-black text-lg">VS</p>
            </div>
            <div className="text-center space-y-1">
              <span className="text-4xl font-black text-pink-400 glow-o block">O</span>
              <p className="text-white/25 text-xs">Player 2</p>
            </div>
          </div>

          {/* Game mode toggle */}
          <div className="space-y-2">
            <p className="text-white/30 text-xs text-center tracking-wide">GAME MODE</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onGameModeChange("classic")}
                className={`rounded-2xl p-3 text-center transition-all duration-200 ${
                  gameMode === "classic"
                    ? "bg-violet-600/30 border border-violet-500/50 text-white font-semibold"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60"
                }`}
              >
                <p className="text-sm font-semibold">Classic</p>
                <p className="text-xs opacity-60 mt-0.5">No time limit</p>
              </button>
              <button
                onClick={() => onGameModeChange("timed")}
                className={`rounded-2xl p-3 text-center transition-all duration-200 ${
                  gameMode === "timed"
                    ? "bg-amber-600/25 border border-amber-500/45 text-white font-semibold"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60"
                }`}
              >
                <p className="text-sm font-semibold">Timed ⏱</p>
                <p className="text-xs opacity-60 mt-0.5">15s per turn</p>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onFindMatch}
          className="btn-primary w-full rounded-2xl py-5 text-white font-bold text-base"
        >
          Find Match
        </button>

        {/* Leaderboard link */}
        <button
          onClick={onLeaderboard}
          className="w-full glass border border-white/10 hover:border-white/20 rounded-2xl py-3.5 text-white/50 hover:text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>🏆</span>
          <span>Leaderboard</span>
        </button>
      </div>
    </div>
  );
}
