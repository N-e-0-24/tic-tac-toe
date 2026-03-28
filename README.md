# Tic-Tac-Toe — Real-time Multiplayer

A real-time multiplayer Tic-Tac-Toe game built with React + TypeScript on the frontend and [Nakama](https://heroiclabs.com/nakama/) as the game server backend.

## Features

- Real-time multiplayer via WebSocket
- Matchmaking system
- Leaderboard
- Win / draw detection
- Deployed on Fly.io

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Game Server | Nakama 3.21 |
| Database | PostgreSQL 15 |
| Deployment | Fly.io (server), Netlify (client) |

## Project Structure

```
tic-tac-toe/
├── client/                  # React + TypeScript frontend
│   ├── src/
│   │   ├── hooks/           # useNakama — auth, matchmaking, socket
│   │   ├── lib/             # Nakama SDK init
│   │   └── screens/         # NicknameScreen → Lobby → Matchmaking → Game
│   └── vite.config.ts
├── server/
│   └── modules/main.ts      # Nakama match handler (game logic)
├── docker-compose.yml       # Nakama + PostgreSQL
├── Dockerfile.nakama
└── fly.toml                 # Fly.io deployment config
```

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) (for the game server)
- Node.js 18+

### 1. Start the Game Server

```bash
docker-compose up
```

This starts Nakama on `localhost:7350` and PostgreSQL on `localhost:5432`.

### 2. Start the Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## How to Play

1. Enter a nickname
2. Create or join a lobby
3. Wait for matchmaking to find an opponent
4. Take turns placing X and O — first to get 3 in a row wins!

## Deployment

The server is deployed on **Fly.io** (`tictactoe-nakama.fly.dev`) and the client on **Netlify**.

To deploy the server:

```bash
fly deploy
```
