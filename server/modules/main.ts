// Nakama server module — TicTacToe match handler
// Written as plain JS (Nakama's JS runtime doesn't need a build step)

const OP_MOVE = 1;        // client → server: player makes a move
const OP_STATE = 2;       // server → client: broadcast full game state
const OP_GAME_OVER = 3;   // server → client: game ended

const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],         // diagonals
];

function checkWinner(board) {
  for (const [a,b,c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // returns "X" or "O"
    }
  }
  return null;
}

function isDraw(board) {
  return board.every(cell => cell !== "") && !checkWinner(board);
}

const matchInit = function(ctx, logger, nk, params) {
  const state = {
    board: Array(9).fill(""),
    players: [],      // [userId1, userId2] — index 0 = X, index 1 = O
    currentTurn: 0,   // index into players array
    gameOver: false,
  };
  logger.info("Match initialised");
  return { state, tickRate: 1 };
};

const matchJoinAttempt = function(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  if (state.players.length >= 2) {
    return { state, accept: false, rejectMessage: "Match is full" };
  }
  return { state, accept: true };
};

const matchJoin = function(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (const p of presences) {
    if (state.players.length < 2) {
      state.players.push(p.userId);
      logger.info("Player joined: " + p.userId + " as " + (state.players.length === 1 ? "X" : "O"));
    }
  }

  // Once both players joined, broadcast initial state
  if (state.players.length === 2) {
    const payload = JSON.stringify({
      board: state.board,
      currentTurn: state.players[state.currentTurn],
      players: state.players,
      symbol: { [state.players[0]]: "X", [state.players[1]]: "O" },
    });
    dispatcher.broadcastMessage(OP_STATE, payload, null, null, true);
  }

  return { state };
};

const matchLeave = function(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (const p of presences) {
    logger.info("Player left: " + p.userId);
    if (!state.gameOver) {
      // Opponent wins by forfeit
      const winnerIdx = state.players[0] === p.userId ? 1 : 0;
      const payload = JSON.stringify({
        board: state.board,
        winner: state.players[winnerIdx],
        reason: "opponent_left",
        symbol: { [state.players[0]]: "X", [state.players[1]]: "O" },
      });
      dispatcher.broadcastMessage(OP_GAME_OVER, payload, null, null, true);
      state.gameOver = true;
    }
  }
  return { state };
};

const matchLoop = function(ctx, logger, nk, dispatcher, tick, state, messages) {
  for (const msg of messages) {
    if (state.gameOver) continue;
    if (msg.opCode !== OP_MOVE) continue;

    // Validate it's this player's turn
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

    // Validate cell index and that cell is empty
    if (typeof index !== "number" || index < 0 || index > 8 || state.board[index] !== "") {
      logger.warn("Invalid move index: " + index);
      continue;
    }

    // Apply move
    const symbol = state.currentTurn === 0 ? "X" : "O";
    state.board[index] = symbol;

    const winner = checkWinner(state.board);
    const draw = isDraw(state.board);

    if (winner || draw) {
      state.gameOver = true;
      const payload = JSON.stringify({
        board: state.board,
        winner: winner ? msg.sender.userId : null,
        draw,
        symbol: { [state.players[0]]: "X", [state.players[1]]: "O" },
      });
      dispatcher.broadcastMessage(OP_GAME_OVER, payload, null, null, true);
    } else {
      // Advance turn
      state.currentTurn = state.currentTurn === 0 ? 1 : 0;
      const payload = JSON.stringify({
        board: state.board,
        currentTurn: state.players[state.currentTurn],
        players: state.players,
        symbol: { [state.players[0]]: "X", [state.players[1]]: "O" },
      });
      dispatcher.broadcastMessage(OP_STATE, payload, null, null, true);
    }
  }

  return { state };
};

const matchTerminate = function(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return { state };
};

const matchSignal = function(ctx, logger, nk, dispatcher, tick, state, data) {
  return { state, data };
};

InitModule = function(ctx, logger, nk, initializer) {
  initializer.registerMatch("tictactoe", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal,
  });

  // Called by Nakama automatically when matchmaker finds 2 players
  initializer.registerMatchmakerMatched(function(ctx, logger, nk, matches) {
    logger.info("Matchmaker matched " + matches.length + " players, creating authoritative match");
    const matchId = nk.matchCreate("tictactoe", {});
    return matchId;
  });

  logger.info("TicTacToe match handler registered");
};