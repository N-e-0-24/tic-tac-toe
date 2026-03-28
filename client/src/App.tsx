import { useNakama } from "./hooks/useNakama.ts";
import NicknameScreen from "./screens/NicknameScreen";
import LobbyScreen from "./screens/LobbyScreen";
import MatchmakingScreen from "./screens/MatchMakingScreen";
import GameScreen from "./screens/GameScreen.tsx";
import LeaderboardScreen from "./screens/LeaderboardScreen";

export default function App() {
  const {
    appState, session, socket, matchId,
    username, error, gameMode, pendingMatchData,
    setGameMode, submitNickname, findMatch, cancelMatchmaking,
    returnToLobby, openLeaderboard, closeLeaderboard,
    fetchLeaderboard, fetchMyStats,
  } = useNakama();

  if (appState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-white/10 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  if (appState === "nickname") {
    return <NicknameScreen onSubmit={submitNickname} error={error} />;
  }

  if (appState === "matchmaking") {
    return <MatchmakingScreen onCancel={cancelMatchmaking} gameMode={gameMode} />;
  }

  if (appState === "game" && socket && matchId && session && session.user_id) {
    return (
      <GameScreen
        socket={socket}
        matchId={matchId}
        userId={session.user_id}
        username={username}
        pendingMatchData={pendingMatchData}
        onPlayAgain={returnToLobby}
      />
    );
  }

  if (appState === "leaderboard") {
    return (
      <LeaderboardScreen
        username={username}
        onBack={closeLeaderboard}
        fetchLeaderboard={fetchLeaderboard}
        fetchMyStats={fetchMyStats}
      />
    );
  }

  return (
    <LobbyScreen
      username={username}
      gameMode={gameMode}
      onGameModeChange={setGameMode}
      onFindMatch={findMatch}
      onLeaderboard={openLeaderboard}
      error={error}
    />
  );
}
