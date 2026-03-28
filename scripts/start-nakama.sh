#!/bin/sh
set -e

# Wait for Postgres to be ready
echo "Waiting for database..."
until /nakama/nakama migrate up \
  --database.address "${DATABASE_URL}" 2>&1 | grep -v "error"; do
  echo "Migration not ready yet, retrying in 3s..."
  sleep 3
done

echo "Starting Nakama..."
exec /nakama/nakama \
  --name nakama1 \
  --database.address "${DATABASE_URL}" \
  --logger.level INFO \
  --session.token_expiry_sec 7200 \
  --socket.server_key "${SERVER_KEY:-tictactoe-server-key}"
