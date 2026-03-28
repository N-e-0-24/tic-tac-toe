import { useState, useEffect, useRef } from "react";
import type { Session, MatchData } from "@heroiclabs/nakama-js";
import type { Socket } from "@heroiclabs/nakama-js";
import { client, saveSession, loadSession, createSocket } from "../lib/nakama";

export type AppState = "loading" | "nickname" | "lobby" | "matchmaking" | "game" | "leaderboard";
export type GameMode = "classic" | "timed";

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  ownerId: string;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
}

export interface NakamaState {
  appState: AppState;
  session: Session | null;
  socket: Socket | null;
  matchId: string | null;
  username: string;
  error: string;
  gameMode: GameMode;
  pendingMatchData: React.MutableRefObject<MatchData[]>;
  setGameMode: (mode: GameMode) => void;
  submitNickname: (name: string) => Promise<void>;
  findMatch: () => Promise<void>;
  cancelMatchmaking: () => Promise<void>;
  returnToLobby: () => void;
  openLeaderboard: () => void;
  closeLeaderboard: () => void;
  fetchLeaderboard: () => Promise<LeaderboardEntry[]>;
  fetchMyStats: () => Promise<PlayerStats>;
}

export function useNakama(): NakamaState {
  const [appState, setAppState] = useState<AppState>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const ticketRef = useRef<string | null>(null);
  const pendingMatchData = useRef<MatchData[]>([]);

  useEffect(() => {
    initSession();
  }, []);

  async function initSession() {
    try {
      let s = loadSession();
      if (!s) {
        let deviceId = localStorage.getItem("device_id");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("device_id", deviceId);
        }
        s = await client.authenticateDevice(deviceId, true);
        saveSession(s);
      }
      setSession(s);

      const account = await client.getAccount(s);
      const name = account.user?.display_name ?? "";

      if (name) {
        setUsername(name);
        const sock = await connectSocket(s);
        setSocket(sock);
        setAppState("lobby");
      } else {
        setAppState("nickname");
      }
    } catch (e) {
      setError("Failed to connect. Is Nakama running?");
      setAppState("nickname");
    }
  }

  async function connectSocket(s: Session): Promise<Socket> {
    const sock = createSocket();
    await sock.connect(s, true);
    return sock;
  }

  async function submitNickname(name: string) {
    if (!session) return;
    try {
      await client.updateAccount(session, { display_name: name });
      setUsername(name);
      const sock = await connectSocket(session);
      setSocket(sock);
      setAppState("lobby");
    } catch (e) {
      setError("Failed to save nickname. Try again.");
    }
  }

  async function findMatch() {
    if (!socket || !session) return;
    setAppState("matchmaking");
    setError("");

    try {
      socket.onmatchmakermatched = async (matched) => {
        console.log("Matchmaker matched!", matched);
        try {
          pendingMatchData.current = [];
          socket.onmatchdata = (result) => {
            pendingMatchData.current.push(result);
          };

          const mId = (matched as any).match_id ?? undefined;
          const token = matched.token ?? undefined;
          const match = await socket.joinMatch(mId, token);
          console.log("Joined match:", match.match_id);
          setMatchId(match.match_id);
          setAppState("game");
        } catch (err) {
          console.error("Join match error", err);
          setError("Failed to join match.");
          setAppState("lobby");
        }
      };

      const ticket = await socket.addMatchmaker("*", 2, 2, { mode: gameMode }, {});
      console.log("Matchmaking ticket added:", ticket.ticket, "mode:", gameMode);
      ticketRef.current = ticket.ticket;
    } catch (e) {
      console.error("Matchmaking error", e);
      setError("Matchmaking failed. Try again.");
      setAppState("lobby");
    }
  }

  async function cancelMatchmaking() {
    if (!socket || !ticketRef.current) return;
    try {
      await socket.removeMatchmaker(ticketRef.current);
    } catch (_) {}
    ticketRef.current = null;
    setAppState("lobby");
  }

  function returnToLobby() {
    setMatchId(null);
    setAppState("lobby");
  }

  function openLeaderboard() {
    setAppState("leaderboard");
  }

  function closeLeaderboard() {
    setAppState("lobby");
  }

 async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!session) return [];
  try {
    const result = await client.rpc(session, "get_leaderboard", {});
    const data = result.payload as { records: LeaderboardEntry[] };
    return data.records || [];
  } catch (e) {
    console.error("fetchLeaderboard error", e);
    return [];
  }
}

async function fetchMyStats(): Promise<PlayerStats> {
  if (!session) return { wins: 0, losses: 0, draws: 0 };
  try {
    const result = await client.rpc(session, "get_my_stats", {});
    return result.payload as PlayerStats;
  } catch (e) {
    console.error("fetchMyStats error", e);
    return { wins: 0, losses: 0, draws: 0 };
  }
}

  return {
    appState, session, socket, matchId,
    username, error, gameMode, pendingMatchData,
    setGameMode, submitNickname, findMatch, cancelMatchmaking,
    returnToLobby, openLeaderboard, closeLeaderboard,
    fetchLeaderboard, fetchMyStats,
  };
}
