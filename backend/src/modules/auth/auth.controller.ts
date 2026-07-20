import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authService from './auth.service';

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

authRouter.post(
  '/sign-up',
  asyncHandler(async (req, res) => {
    const { email, password } = credentialsSchema.parse(req.body);
    const session = await authService.signUp(email, password);
    res.status(201).json(session);
  }),
);

authRouter.post(
  '/sign-in',
  asyncHandler(async (req, res) => {
    const { email, password } = credentialsSchema.parse(req.body);
    const session = await authService.signIn(email, password);
    res.json(session);
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    const session = await authService.refresh(refreshToken);
    res.json(session);
  }),
);

authRouter.post(
  '/sign-out',
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    await authService.signOut(refreshToken);
    res.status(204).send();
  }),
);
