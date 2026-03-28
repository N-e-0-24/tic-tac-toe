import { useEffect, useState } from "react";
import type { MatchData, Socket } from "@heroiclabs/nakama-js";

const OP_MOVE      = 1;
const OP_STATE     = 2;
const OP_GAME_OVER = 3;

interface GameState {
  board: string[];
  currentTurn: string;
  players: string[];
  symbol: Record<string, string>;
  timedMode?: boolean;
  turnDeadlineMs?: number | null;
}

interface GameOver {
  board: string[];
  winner: string | null;
  draw: boolean;
  reason?: string;
  symbol: Record<string, string>;
}

interface Props {
  socket: Socket;
  matchId: string;
  userId: string;
  username: string;
  pendingMatchData: React.MutableRefObject<MatchData[]>;
  onPlayAgain: () => void;
}

export default function GameScreen({ socket, matchId, userId, username, pendingMatchData, onPlayAgain }: Props) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOver, setGameOver] = useState<GameOver | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    function handleMatchData(result: MatchData) {
      const raw = new TextDecoder().decode(result.data);
      const data = JSON.parse(raw);
      if (result.op_code === OP_STATE) {
        setGameState(data as GameState);
        setGameOver(null);
      } else if (result.op_code === OP_GAME_OVER) {
        setGameOver(data as GameOver);
      }
    }

    const buffered = pendingMatchData.current.splice(0);
    for (const msg of buffered) handleMatchData(msg);

    socket.onmatchdata = handleMatchData;
    return () => { socket.onmatchdata = () => {}; };
  }, [socket]);

  // Countdown timer — deadline is captured as a local const, no stale closure
  useEffect(() => {
    if (!gameState?.timedMode || !gameState.turnDeadlineMs || gameOver) {
      setTimeLeft(null);
      return;
    }
    const deadline = gameState.turnDeadlineMs;
    const calc = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    setTimeLeft(calc());           // show immediately, no waiting for first tick
    const id = setInterval(() => setTimeLeft(calc()), 500);
    return () => clearInterval(id);
  }, [gameState?.timedMode, gameState?.turnDeadlineMs, gameOver]);

  function sendMove(index: number) {
    if (!gameState || gameOver) return;
    if (gameState.currentTurn !== userId) return;
    if (gameState.board[index] !== "") return;
    const payload = new TextEncoder().encode(JSON.stringify({ index }));
    socket.sendMatchState(matchId, OP_MOVE, payload);
  }

  const mySymbol       = gameState?.symbol[userId] ?? "?";
  const opponentSymbol = mySymbol === "X" ? "O" : "X";
  const isMyTurn       = gameState?.currentTurn === userId;
  const board          = gameOver?.board ?? gameState?.board ?? Array(9).fill("");
  const timedMode      = !!gameState?.timedMode;

  function getResult() {
    if (!gameOver) return null;
    if (gameOver.reason === "opponent_left") return "win";
    if (gameOver.draw) return "draw";
    return gameOver.winner === userId ? "win" : "loss";
  }

  const result = getResult();

  // Timer colour
  const timerUrgent = timeLeft !== null && timeLeft <= 5;
  const timerWarning = timeLeft !== null && timeLeft <= 10 && timeLeft > 5;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 gap-5">

      {/* Player bar */}
      <div className="w-full max-w-sm anim-slide-up">
        <div className="flex items-center justify-between gap-3">
          {/* Me */}
          <div className="glass-md rounded-2xl px-4 py-3 flex items-center gap-2.5 flex-1">
            <span className={`text-xl font-black ${mySymbol === "X" ? "text-indigo-400 glow-x" : "text-pink-400 glow-o"}`}>
              {mySymbol}
            </span>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{username}</p>
              <p className="text-white/25 text-xs">You</p>
            </div>
          </div>

          <span className="text-white/20 font-black text-sm shrink-0">VS</span>

          {/* Opponent */}
          <div className="glass-md rounded-2xl px-4 py-3 flex items-center gap-2.5 flex-1 flex-row-reverse">
            <span className={`text-xl font-black ${opponentSymbol === "X" ? "text-indigo-400 glow-x" : "text-pink-400 glow-o"}`}>
              {opponentSymbol}
            </span>
            <div className="min-w-0 text-right">
              <p className="text-white text-xs font-semibold">Opponent</p>
              <p className="text-white/25 text-xs">Player</p>
            </div>
          </div>
        </div>
      </div>

      {/* Turn indicator + timer */}
      {!gameOver && (
        <div className="flex flex-col items-center gap-2">
          <div
            className="rounded-full px-5 py-2 flex items-center gap-2 transition-all duration-300"
            style={{
              background: isMyTurn ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.03)",
              border: isMyTurn ? "1px solid rgba(124,58,237,0.35)" : "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              !gameState ? "bg-amber-400 animate-pulse" :
              isMyTurn ? "bg-violet-400 animate-pulse" : "bg-white/20"
            }`} />
            <span className={`text-xs font-medium ${
              !gameState ? "text-amber-300/70" :
              isMyTurn ? "text-violet-300" : "text-white/35"
            }`}>
              {!gameState ? "Waiting for opponent…" : isMyTurn ? "Your turn" : "Opponent's turn"}
            </span>
          </div>

          {/* Countdown timer (timed mode) */}
          {timedMode && timeLeft !== null && (
            <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${
              timerUrgent
                ? "bg-red-500/20 border border-red-500/40 text-red-300 animate-pulse"
                : timerWarning
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                : "bg-white/[0.04] border border-white/10 text-white/50"
            }`}>
              <span>⏱</span>
              <span>{timeLeft}s</span>
            </div>
          )}
        </div>
      )}

      {/* Board */}
      <div className="w-full max-w-[340px] anim-slide-up" style={{ animationDelay: "0.1s" }}>
        <div
          className="p-px rounded-3xl"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.45) 0%, rgba(255,255,255,0.04) 50%, rgba(6,182,212,0.35) 100%)" }}
        >
          <div className="rounded-3xl overflow-hidden">
            <div
              className="grid grid-cols-3"
              style={{ gap: "1px", background: "rgba(255,255,255,0.08)" }}
            >
              {board.map((cell, i) => {
                const isPlayable = !gameOver && isMyTurn && cell === "" && !!gameState;
                return (
                  <button
                    key={i}
                    onClick={() => sendMove(i)}
                    disabled={!isPlayable}
                    className={`
                      aspect-square flex items-center justify-center transition-all duration-200
                      ${cell === "X" ? "cell-x-bg" : cell === "O" ? "cell-o-bg" : "cell-base"}
                      ${isPlayable ? "cell-hover cursor-pointer" : "cursor-default"}
                    `}
                  >
                    {cell === "X" && (
                      <span className="text-5xl font-black text-indigo-400 glow-x anim-pop-in select-none">X</span>
                    )}
                    {cell === "O" && (
                      <span className="text-5xl font-black text-pink-400 glow-o anim-pop-in select-none">O</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Game over card */}
      {gameOver && (
        <div className="w-full max-w-sm anim-slide-up">
          <div
            className="rounded-3xl p-7 text-center space-y-5"
            style={{
              background:
                result === "win"  ? "linear-gradient(160deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))" :
                result === "loss" ? "linear-gradient(160deg, rgba(239,68,68,0.12), rgba(185,28,28,0.08))" :
                "rgba(255,255,255,0.03)",
              border:
                result === "win"  ? "1px solid rgba(16,185,129,0.25)" :
                result === "loss" ? "1px solid rgba(239,68,68,0.22)" :
                "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="space-y-2">
              <div className="text-5xl">
                {result === "win"  && "🏆"}
                {result === "loss" && "💀"}
                {result === "draw" && "🤝"}
              </div>
              <p className={`text-2xl font-black ${
                result === "win"  ? "text-emerald-400" :
                result === "loss" ? "text-red-400" : "text-white"
              }`}>
                {result === "win"  && "Victory!"}
                {result === "loss" && "Defeat"}
                {result === "draw" && "It's a Draw"}
              </p>
              <p className="text-white/35 text-sm">
                {gameOver.reason === "opponent_left" ? "Opponent disconnected" :
                 gameOver.reason === "timeout"       ? (result === "win" ? "Opponent ran out of time" : "Time's up!") :
                 result === "win"  ? "Excellent play!" :
                 result === "loss" ? "Better luck next time" : "So close!"}
              </p>
            </div>

            <button
              onClick={onPlayAgain}
              className="btn-primary w-full rounded-2xl py-4 text-white font-bold"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
