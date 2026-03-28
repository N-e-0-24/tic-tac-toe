// Nakama server module — TicTacToe match handler
// Features: authoritative match, leaderboard, timed mode, concurrent games

const OP_MOVE       = 1;  // client → server: player makes a move
const OP_STATE      = 2;  // server → client: broadcast full game state
const OP_GAME_OVER  = 3;  // server → client: game ended

const STATS_COLLECTION = "player_stats";
const STATS_KEY        = "stats";
const LEADERBOARD_ID   = "wins_leaderboard";
const TURN_TIME_SECS   = 15;  // seconds per turn in timed mode

const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],         // diagonals
];

function checkWinner(board) {
  for (const [a,b,c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isDraw(board) {
  return board.every(cell => cell !== "") && !checkWinner(board);
}

// ── Stats & Leaderboard ──────────────────────────────────────────────────────

function updatePlayerStats(nk, logger, players, winnerUserId, isDraw) {
  if (!players || players.length < 2) return;
  const p0 = players[0];
  const p1 = players[1];
  logger.info("updatePlayerStats called: p0=" + p0 + " p1=" + p1 + " winner=" + winnerUserId + " draw=" + isDraw);

  let records;
  try {
    records = nk.storageRead([
      { collection: STATS_COLLECTION, key: STATS_KEY, userId: p0 },
      { collection: STATS_COLLECTION, key: STATS_KEY, userId: p1 },
    ]);
  } catch (e) {
    logger.warn("Stats read failed: " + e.message);
    records = [];
  }

  const statsMap = {};
  statsMap[p0] = { wins: 0, losses: 0, draws: 0 };
  statsMap[p1] = { wins: 0, losses: 0, draws: 0 };

  for (const r of records) {
    const uid = r.userId || r.user_id || "";
    if (statsMap[uid] !== undefined && r.value) {
      statsMap[uid] = r.value;
    }
  }

  if (isDraw) {
    statsMap[p0].draws = (statsMap[p0].draws || 0) + 1;
    statsMap[p1].draws = (statsMap[p1].draws || 0) + 1;
  } else {
    const loserId = winnerUserId === p0 ? p1 : p0;
    statsMap[winnerUserId].wins = (statsMap[winnerUserId].wins || 0) + 1;
    statsMap[loserId].losses = (statsMap[loserId].losses || 0) + 1;
  }

  logger.info("Writing stats: p0=" + JSON.stringify(statsMap[p0]) + " p1=" + JSON.stringify(statsMap[p1]));
  try {
    nk.storageWrite([
      { collection: STATS_COLLECTION, key: STATS_KEY, userId: p0, value: statsMap[p0], permissionRead: 2, permissionWrite: 0 },
      { collection: STATS_COLLECTION, key: STATS_KEY, userId: p1, value: statsMap[p1], permissionRead: 2, permissionWrite: 0 },
    ]);
    logger.info("Stats write OK");
  } catch (e) {
    logger.warn("Stats write failed: " + e.message);
  }

  if (!isDraw && winnerUserId) {
    const newWins = statsMap[winnerUserId].wins;
    logger.info("Updating leaderboard for " + winnerUserId + " with wins=" + newWins);

    // Resolve username — in a separate try so a lookup failure never blocks the write
    let winnerUsername = "";
    try {
      const users = nk.usersGetId([winnerUserId]);
      if (users && users.length > 0) {
        winnerUsername = users[0].username || users[0].displayName || "";
      }
    } catch (e) {
      logger.warn("Username lookup failed (non-fatal): " + e.message);
    }

    // Always attempt the leaderboard write
    try {
      nk.leaderboardRecordWrite(LEADERBOARD_ID, winnerUserId, winnerUsername, newWins, 0, {});
      logger.info("Leaderboard record written: user=" + winnerUserId + " score=" + newWins);
    } catch (e) {
      logger.warn("Leaderboard write failed: " + e.message);
    }
  }
}

// ── RPC Handlers ────────────────────────────────────────────────────────────

function rpcGetLeaderboard(ctx, logger, nk, payload) {
  try {
    const result = nk.leaderboardRecordsList(LEADERBOARD_ID, null, 10, null, null);
    logger.info("Leaderboard fetch: " + JSON.stringify(result));
    const rawRecords = result.records || result.Records || [];
    const records = rawRecords.map(r => ({
      rank:     r.rank     ?? r.Rank     ?? 0,
      username: r.username || r.Username || "Anonymous",
      score:    r.score    ?? r.Score    ?? 0,
      ownerId:  r.ownerId  || r.owner_id || r.OwnerId || "",
    }));
    return JSON.stringify({ records: records });
  } catch (e) {
    logger.warn("rpcGetLeaderboard error: " + e.message);
    return JSON.stringify({ records: [] });
  }
}

function rpcGetMyStats(ctx, logger, nk, payload) {
  const userId = ctx.userId;
  try {
    const records = nk.storageRead([
      { collection: STATS_COLLECTION, key: STATS_KEY, userId: userId },
    ]);
    const stats = (records && records.length > 0 && records[0].value)
      ? records[0].value
      : { wins: 0, losses: 0, draws: 0 };
    return JSON.stringify(stats);
  } catch (e) {
    logger.warn("rpcGetMyStats error: " + e.message);
    return JSON.stringify({ wins: 0, losses: 0, draws: 0 });
  }
}

// ── Match Handlers ───────────────────────────────────────────────────────────

const matchInit = function(ctx, logger, nk, params) {
  logger.info("matchInit params received: " + JSON.stringify(params));
  const timedMode = !!(params && params.mode === "timed");
  const state = {
    board: Array(9).fill(""),
    players: [],        // [userId0, userId1] — index 0 = X, index 1 = O
    currentTurn: 0,     // index into players array
    gameOver: false,
    timedMode: timedMode,
    turnDeadlineMs: 0,  // epoch ms when the current turn expires (0 = not started)
  };
  logger.info("Match initialised, timedMode=" + timedMode);
  return { state: state, tickRate: 1 };
};

const matchJoinAttempt = function(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  if (state.players.length >= 2) {
    return { state: state, accept: false, rejectMessage: "Match is full" };
  }
  return { state: state, accept: true };
};

const matchJoin = function(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (const p of presences) {
    if (state.players.length < 2) {
      state.players.push(p.userId);
      logger.info("Player joined: " + p.userId + " as " + (state.players.length === 1 ? "X" : "O"));
    }
  }

  if (state.players.length === 2) {
    if (state.timedMode) {
      state.turnDeadlineMs = Date.now() + TURN_TIME_SECS * 1000;
    }

    const payload = JSON.stringify({
      board: state.board,
      currentTurn: state.players[state.currentTurn],
      players: state.players,
      symbol: { [state.players[0]]: "X", [state.players[1]]: "O" },
      timedMode: state.timedMode,
      turnDeadlineMs: state.timedMode ? state.turnDeadlineMs : null,
    });
    dispatcher.broadcastMessage(OP_STATE, payload, null, null, true);
  }

  return { state: state };
};

const matchLeave = function(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (const p of presences) {
    logger.info("Player left: " + p.userId);
    if (!state.gameOver && state.players.length === 2) {
      const winnerIdx = state.players[0] === p.userId ? 1 : 0;
      const winnerId = state.players[winnerIdx];
      updatePlayerStats(nk, logger, state.players, winnerId, false);
      const payload = JSON.stringify({
        board: state.board,
        winner: winnerId,
        draw: false,
        reason: "opponent_left",
        symbol: { [state.players[0]]: "X", [state.players[1]]: "O" },
      });
      dispatcher.broadcastMessage(OP_GAME_OVER, payload, null, null, true);
      state.gameOver = true;
    }
  }
  return { state: state };
};

const matchLoop = function(ctx, logger, nk, dispatcher, tick, state, messages) {
  // Timer check — must happen before processing moves
  if (state.timedMode && !state.gameOver && state.players.length === 2 && state.turnDeadlineMs > 0) {
    if (Date.now() >= state.turnDeadlineMs) {
      const timedOutIdx = state.currentTurn;
      const winnerIdx   = timedOutIdx === 0 ? 1 : 0;
      const winnerId    = state.players[winnerIdx];
      state.gameOver = true;
      logger.info("Turn timeout — winner: " + winnerId);
      updatePlayerStats(nk, logger, state.players, winnerId, false);
      const payload = JSON.stringify({
        board: state.board,
        winner: winnerId,
        draw: false,
        reason: "timeout",
        symbol: { [state.players[0]]: "X", [state.players[1]]: "O" },
      });
      dispatcher.broadcastMessage(OP_GAME_OVER, payload, null, null, true);
      return { state: state };
    }
  }

  // Process move messages
  for (const msg of messages) {
    if (state.gameOver) continue;
    if (msg.opCode !== OP_MOVE) continue;

    const expectedPlayer = state.players[state.currentTurn];
    if (msg.sender.userId !== expectedPlayer) {
      logger.warn("Move from wrong player: " + msg.sender.userId);
      continue;
    }

    let move;
    try {
      move = JSON.parse(nk.binaryToString(msg.data));
    } catch (e) {
      logger.warn("Invalid move payload");
      continue;
    }

    const { index } = move;

    if (typeof index !== "number" || index < 0 || index > 8 || state.board[index] !== "") {
      logger.warn("Invalid move index: " + index);
      continue;
    }

    const symbol = state.currentTurn === 0 ? "X" : "O";
    state.board[index] = symbol;

    const winner  = checkWinner(state.board);
    const draw    = isDraw(state.board);

    if (winner || draw) {
      state.gameOver = true;
      const winnerId = winner ? msg.sender.userId : null;
      updatePlayerStats(nk, logger, state.players, winnerId, !!draw);
      const payload = JSON.stringify({
        board: state.board,
        winner: winnerId,
        draw: !!draw,
        symbol: { [state.players[0]]: "X", [state.players[1]]: "O" },
      });
      dispatcher.broadcastMessage(OP_GAME_OVER, payload, null, null, true);
    } else {
      state.currentTurn = state.currentTurn === 0 ? 1 : 0;
      if (state.timedMode) {
        state.turnDeadlineMs = Date.now() + TURN_TIME_SECS * 1000;
      }
      const payload = JSON.stringify({
        board: state.board,
        currentTurn: state.players[state.currentTurn],
        players: state.players,
        symbol: { [state.players[0]]: "X", [state.players[1]]: "O" },
        timedMode: state.timedMode,
        turnDeadlineMs: state.timedMode ? state.turnDeadlineMs : null,
      });
      dispatcher.broadcastMessage(OP_STATE, payload, null, null, true);
    }
  }

  return { state: state };
};

const matchTerminate = function(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return { state: state };
};

const matchSignal = function(ctx, logger, nk, dispatcher, tick, state, data) {
  return { state: state, data: data };
};

// ── Matchmaker ───────────────────────────────────────────────────────────────

function matchmakerMatched(ctx, logger, nk, matches) {
  // Log the raw first entry so we can confirm the property shape
  logger.info("matchmakerMatched first entry: " + JSON.stringify(matches[0]));

  // Nakama JS runtime merges string+numeric props into a single `properties` object
  let mode = "classic";
  for (const m of matches) {
    const props = m.properties || m.stringProperties || {};
    if (props.mode === "timed") {
      mode = "timed";
      break;
    }
  }
  logger.info("Matchmaker matched " + matches.length + " players, mode=" + mode + ", creating match");
  const matchId = nk.matchCreate("tictactoe", { mode: mode });
  return matchId;
}

// ── Init ─────────────────────────────────────────────────────────────────────

function InitModule(ctx, logger, nk, initializer) {
  // Create leaderboard (idempotent)
  try {
    nk.leaderboardCreate(LEADERBOARD_ID, true, "desc", "best", null, null);
    logger.info("Leaderboard ready: " + LEADERBOARD_ID);
  } catch (e) {
    logger.info("Leaderboard already exists or error: " + e.message);
  }

  initializer.registerMatch("tictactoe", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });

  initializer.registerMatchmakerMatched(matchmakerMatched);

  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);
  initializer.registerRpc("get_my_stats", rpcGetMyStats);

  logger.info("TicTacToe module registered (leaderboard + timed mode)");
}
