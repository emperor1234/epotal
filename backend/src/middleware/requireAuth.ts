import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/errors';
import { verifyAccessToken } from '../modules/auth/token.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing bearer token'));
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}
