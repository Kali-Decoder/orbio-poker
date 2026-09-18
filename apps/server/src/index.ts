import http from 'node:http';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { authRouter } from './auth.js';
import { connectMongo } from './db.js';
import { hydrateGamesFromDb } from './game-store.js';
import { gamesRouter } from './routes.js';
import { createSocketServer } from './socket.js';

const PORT = Number(process.env.PORT ?? 4000);
const MONGODB_URI = process.env.MONGODB_URI ?? 'memory';
const MONGODB_DB = process.env.MONGODB_DB;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

async function main() {
  await connectMongo(MONGODB_URI, MONGODB_DB);
  await hydrateGamesFromDb();

  const app = express();
  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/auth', authRouter);
  app.use('/games', gamesRouter);

  const server = http.createServer(app);
  createSocketServer(server, CORS_ORIGIN);

  server.listen(PORT, () => {
    console.log(`Poker server listening on http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
