import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import { ContactDescriptionService } from '../ai/contact-description.service';
import { UserAiKeyService } from '../ai/user-ai-key.service';
import * as contactsService from './contacts.service';

export const contactsRouter = Router();
contactsRouter.use(requireAuth);

const descriptionService = new ContactDescriptionService(new UserAiKeyService());

const listQuerySchema = z.object({
  industry: z.string().optional(),
  country: z.string().optional(),
  cursor: z.string().optional(),
  take: z.coerce.number().int().positive().max(50).optional(),
});

contactsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const contacts = await contactsService.listContacts(query);
    res.json({ contacts });
  }),
);

contactsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const contact = await contactsService.getContact(String(req.params.id));
    res.json({ contact });
  }),
);

contactsRouter.get(
  '/:id/summary',
  asyncHandler(async (req, res) => {
    const contact = await contactsService.getContact(String(req.params.id));
    const summary = await descriptionService.getOrGenerate(req.userId!, contact.id, {
      fullName: contact.fullName,
      jobTitle: contact.jobTitle,
      companyName: contact.company?.name,
      industry: contact.industry,
      country: contact.country,
      seniority: contact.seniority,
    });
    res.json({ summary });
  }),
);

contactsRouter.post(
  '/:id/reveal',
  asyncHandler(async (req, res) => {
    const reveal = await contactsService.revealContact(req.userId!, String(req.params.id));
    res.json({ reveal });
  }),
);
