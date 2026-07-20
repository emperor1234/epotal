import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import * as creditLedger from './credit-ledger.service';

export const creditsRouter = Router();
creditsRouter.use(requireAuth);

creditsRouter.get(
  '/wallet',
  asyncHandler(async (req, res) => {
    const wallet = await creditLedger.getWallet(req.userId!);
    res.json({ wallet });
  }),
);
