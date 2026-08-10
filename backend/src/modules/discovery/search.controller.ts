import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import { enqueueSearchJob, removePendingSearchJob } from '../../queues/search.queue';
import { createSearchQuery } from './search.service';

export const searchRouter = Router();
searchRouter.use(requireAuth);

const searchTargetSchema = z.object({
  industry: z.string().min(1),
  country: z.string().min(1),
  seniority: z.string().optional(),
  jobTitle: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  keywords: z.array(z.string()).optional(),
  excludedKeywords: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  sources: z.array(z.enum(['linkedin', 'facebook', 'instagram', 'x', 'web'])).min(1).max(5).optional(),
  includeRelatedTitles: z.boolean().optional(),
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

searchRouter.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const searchQuery = await prisma.searchQuery.findUnique({ where: { id } });
    if (!searchQuery || searchQuery.userId !== req.userId) throw ApiError.notFound('Search not found');

    if (searchQuery.status === 'queued' || searchQuery.status === 'running') {
      await prisma.searchQuery.update({ where: { id }, data: { status: 'cancelled' } });
      await removePendingSearchJob(id);
    }

    res.json({ status: searchQuery.status === 'queued' || searchQuery.status === 'running' ? 'cancelled' : searchQuery.status });
  }),
);

searchRouter.get(
  '/:id/results',
  asyncHandler(async (req, res) => {
    const searchQuery = await prisma.searchQuery.findUnique({ where: { id: String(req.params.id) } });
    if (!searchQuery || searchQuery.userId !== req.userId) throw ApiError.notFound('Search not found');

    const results = await prisma.searchResult.findMany({
      where: { searchQueryId: searchQuery.id },
      include: { contact: { include: { company: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const contacts = results.map((result) => result.contact);

    res.json({ status: searchQuery.status, contacts });
  }),
);
