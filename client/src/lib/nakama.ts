import { Client, Session } from "@heroiclabs/nakama-js";
import type { Socket } from "@heroiclabs/nakama-js";

const HOST = import.meta.env.VITE_NAKAMA_HOST ?? "localhost";
const PORT = import.meta.env.VITE_NAKAMA_PORT ?? "7350";
const SERVER_KEY = import.meta.env.VITE_NAKAMA_SERVER_KEY ?? "tictactoe-server-key";
const USE_SSL = import.meta.env.VITE_NAKAMA_USE_SSL === "true";

// Single shared client instance
export const client = new Client(SERVER_KEY, HOST, PORT, USE_SSL);

// Helpers to persist session across page refreshes
const SESSION_KEY = "nakama_session";

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    token: session.token,
    refresh_token: session.refresh_token,
  }));
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { token, refresh_token } = JSON.parse(raw);
    const session = Session.restore(token, refresh_token);
    // Discard if expired
    if (session.isexpired(Date.now() / 1000)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Creates and connects a real-time socket for a given session
export function createSocket(): Socket {
  return client.createSocket(USE_SSL);
}