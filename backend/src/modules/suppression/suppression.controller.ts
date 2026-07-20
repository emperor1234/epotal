import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as suppressionService from './suppression.service';

export const suppressionRouter = Router();
suppressionRouter.use(requireAuth);

suppressionRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const entries = await suppressionService.listSuppressions();
    res.json({ entries });
  }),
);

suppressionRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email, reason } = z.object({ email: z.string().email(), reason: z.string().min(1) }).parse(req.body);
    const entry = await suppressionService.addSuppression(email, reason);
    res.status(201).json({ entry });
  }),
);

suppressionRouter.delete(
  '/:email',
  asyncHandler(async (req, res) => {
    await suppressionService.removeSuppression(String(req.params.email));
    res.status(204).send();
  }),
);
