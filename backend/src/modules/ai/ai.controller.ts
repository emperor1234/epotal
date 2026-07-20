import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import { UserAiKeyService } from './user-ai-key.service';

export const aiRouter = Router();
aiRouter.use(requireAuth);

const aiKeyService = new UserAiKeyService();

aiRouter.get(
  '/key',
  asyncHandler(async (req, res) => {
    const hasKey = await aiKeyService.hasKey(req.userId!);
    res.json({ hasKey });
  }),
);

aiRouter.put(
  '/key',
  asyncHandler(async (req, res) => {
    const { apiKey } = z.object({ apiKey: z.string().min(1) }).parse(req.body);
    await aiKeyService.saveKey(req.userId!, apiKey);
    res.status(204).send();
  }),
);

aiRouter.delete(
  '/key',
  asyncHandler(async (req, res) => {
    await aiKeyService.deleteKey(req.userId!);
    res.status(204).send();
  }),
);
