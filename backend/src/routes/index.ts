import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.controller';
import { meRouter } from '../modules/auth/me.controller';
import { aiRouter } from '../modules/ai/ai.controller';
import { contactsRouter } from '../modules/contacts/contacts.controller';
import { creditsRouter } from '../modules/credits/credits.controller';
import { searchRouter } from '../modules/discovery/search.controller';
import { suppressionRouter } from '../modules/suppression/suppression.controller';
import { intelligenceRouter } from '../modules/discovery/intelligence.controller';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/me', meRouter);
apiRouter.use('/searches', searchRouter);
apiRouter.use('/contacts', contactsRouter);
apiRouter.use('/credits', creditsRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/suppression', suppressionRouter);
apiRouter.use('/intelligence', intelligenceRouter);
