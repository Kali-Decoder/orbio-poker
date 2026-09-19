import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { SessionModel } from './db.js';

export const SESSION_COOKIE = 'poker_session';

export async function getSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  return SessionModel.findOne({ sessionId }).lean();
}

export const authRouter = Router();

authRouter.post('/nickname', async (req, res) => {
  const nickname = String(req.body?.nickname ?? '').trim();
  if (nickname.length < 2 || nickname.length > 24) {
    res.status(400).json({ error: 'Nickname must be 2-24 characters.' });
    return;
  }

  const existingId = req.cookies?.[SESSION_COOKIE] as string | undefined;
  let session = existingId
    ? await SessionModel.findOne({ sessionId: existingId })
    : null;

  if (session) {
    session.nickname = nickname;
    await session.save();
  } else {
    const sessionId = uuidv4();
    session = await SessionModel.create({
      sessionId,
      nickname,
      chips: 0,
    });
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  res.json({
    sessionId: session.sessionId,
    nickname: session.nickname,
    chips: session.chips,
  });
});

authRouter.get('/me', async (req, res) => {
  const session = await getSession(
    req.cookies?.[SESSION_COOKIE] as string | undefined
  );
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({
    sessionId: session.sessionId,
    nickname: session.nickname,
    chips: session.chips,
  });
});
