import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { UserAiKeyService } from './user-ai-key.service';

const SYSTEM_PROMPT = `You write short, neutral professional summaries for a B2B sales tool.
Rules:
- Use ONLY the fields provided. Never invent facts, achievements, or traits.
- If a field is "Unknown", omit it — do not guess or imply a value.
- Output exactly 2 sentences, plain text, no markdown.
- Neutral, factual tone. No superlatives.`;

export interface ContactSummaryFields {
  fullName: string;
  jobTitle?: string | null;
  companyName?: string | null;
  industry?: string | null;
  country?: string | null;
  seniority?: string | null;
}

export class ContactDescriptionService {
  constructor(private readonly aiKeys: UserAiKeyService) {}

  async getOrGenerate(userId: string, contactId: string, fields: ContactSummaryFields): Promise<{ text: string; source: 'ai' | 'template' }> {
    const cached = await prisma.userContactDescription.findUnique({ where: { userId_contactId: { userId, contactId } } });
    if (cached) return { text: cached.text, source: cached.source as 'ai' | 'template' };

    const client = await this.aiKeys.getClientFor(userId);
    const generated = client ? await this.generateWithAi(client, fields) : this.generateTemplate(fields);

    await prisma.userContactDescription.create({
      data: { userId, contactId, text: generated.text, source: generated.source },
    });

    return generated;
  }

  private async generateWithAi(client: import('openai').default, fields: ContactSummaryFields): Promise<{ text: string; source: 'ai' }> {
    try {
      const userPrompt = buildFieldPrompt(fields);
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 120,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) throw new Error('Empty completion');
      return { text, source: 'ai' };
    } catch (err) {
      logger.warn({ err }, 'AI description generation failed — falling back to template');
      return { text: this.generateTemplate(fields).text, source: 'ai' };
    }
  }

  // Deterministic fallback so the contact card is never empty when the user
  // has no BYOK key configured (SYSTEM_DESIGN.md Section 6.4).
  private generateTemplate(fields: ContactSummaryFields): { text: string; source: 'template' } {
    const roleClause = fields.jobTitle && fields.companyName ? `${fields.jobTitle} at ${fields.companyName}` : fields.jobTitle || fields.companyName || 'a professional';
    const locationClause = fields.country ? ` based in ${fields.country}` : '';
    const industryClause = fields.industry ? ` working in ${fields.industry}` : '';

    const text = `${fields.fullName} is ${roleClause}${locationClause}.${industryClause ? ` They are${industryClause}.` : ''}`.trim();
    return { text, source: 'template' };
  }
}

function buildFieldPrompt(fields: ContactSummaryFields): string {
  const lines = [
    `Name: ${fields.fullName}`,
    `Title: ${fields.jobTitle ?? 'Unknown'}`,
    `Company: ${fields.companyName ?? 'Unknown'}`,
    `Industry: ${fields.industry ?? 'Unknown'}`,
    `Country: ${fields.country ?? 'Unknown'}`,
    `Seniority: ${fields.seniority ?? 'Unknown'}`,
  ];
  return lines.join('\n');
}
