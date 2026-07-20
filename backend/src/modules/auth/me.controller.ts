import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../utils/asyncHandler';

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, email: true, createdAt: true, wallet: true },
    });
    if (!user) throw ApiError.notFound('User not found');
    res.json({ user });
  }),
);
