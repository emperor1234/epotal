import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import { enqueueSearchJob } from '../../queues/search.queue';
import { createSearchQuery } from './search.service';

export const searchRouter = Router();
searchRouter.use(requireAuth);

const searchTargetSchema = z.object({
  industry: z.string().min(1),
  country: z.string().min(1),
  seniority: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  mode: z.enum(['quick', 'full_directory']).default('quick'),
});

searchRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const target = searchTargetSchema.parse(req.body);
    const searchQuery = await createSearchQuery(req.userId!, target);
    await enqueueSearchJob({ searchQueryId: searchQuery.id, userId: req.userId!, target });
    res.status(202).json({ searchQuery });
  }),
);

searchRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const searchQuery = await prisma.searchQuery.findUnique({ where: { id: String(req.params.id) } });
    if (!searchQuery || searchQuery.userId !== req.userId) throw ApiError.notFound('Search not found');
    res.json({ searchQuery });
  }),
);

searchRouter.get(
  '/:id/results',
  asyncHandler(async (req, res) => {
    const searchQuery = await prisma.searchQuery.findUnique({ where: { id: String(req.params.id) } });
    if (!searchQuery || searchQuery.userId !== req.userId) throw ApiError.notFound('Search not found');

    const filters = searchQuery.filters as { industry: string; country: string };
    const contacts = await prisma.contact.findMany({
      where: { industry: filters.industry, country: filters.country },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ status: searchQuery.status, contacts });
  }),
);
