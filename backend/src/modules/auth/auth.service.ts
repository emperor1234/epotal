import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { issueRefreshToken, rotateRefreshToken, revokeRefreshToken, signAccessToken } from './token.service';

const SIGNUP_BONUS_CREDITS = 25;

export async function signUp(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      wallet: { create: { balance: SIGNUP_BONUS_CREDITS } },
    },
  });

  return issueSession(user.id, user.email);
}

export async function signIn(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  return issueSession(user.id, user.email);
}

export async function refresh(presentedToken: string) {
  try {
    const { userId, email, refreshToken } = await rotateRefreshToken(presentedToken);
    const accessToken = signAccessToken({ sub: userId, email });
    return { accessToken, refreshToken };
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
}

export async function signOut(presentedToken: string) {
  await revokeRefreshToken(presentedToken);
}

async function issueSession(userId: string, email: string) {
  const accessToken = signAccessToken({ sub: userId, email });
  const refreshToken = await issueRefreshToken(userId);
  return { accessToken, refreshToken, user: { id: userId, email } };
}
