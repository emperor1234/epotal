import OpenAI from 'openai';
import { prisma } from '../../lib/prisma';
import { decrypt, encrypt } from '../../lib/encryption';
import { ApiError } from '../../lib/errors';

const API_KEY_FORMAT = /^sk-[A-Za-z0-9_-]{20,}$/;

export class UserAiKeyService {
  async saveKey(userId: string, rawApiKey: string): Promise<void> {
    // Cheap sanity check before storing — catches obvious typos without
    // spending a real API call; full validity is confirmed on first use.
    if (!API_KEY_FORMAT.test(rawApiKey)) {
      throw ApiError.badRequest('That does not look like a valid OpenAI API key (expected "sk-...")');
    }
    const encryptedKey = encrypt(rawApiKey);
    await prisma.userAiCredential.upsert({
      where: { userId },
      create: { userId, encryptedKey },
      update: { encryptedKey },
    });
  }

  async hasKey(userId: string): Promise<boolean> {
    const record = await prisma.userAiCredential.findUnique({ where: { userId } });
    return record !== null;
  }

  async getClientFor(userId: string): Promise<OpenAI | null> {
    const record = await prisma.userAiCredential.findUnique({ where: { userId } });
    if (!record) return null;
    const apiKey = decrypt(record.encryptedKey);
    return new OpenAI({ apiKey }); // instantiated per-call, never held in memory beyond the request
  }

  async deleteKey(userId: string): Promise<void> {
    await prisma.userAiCredential.deleteMany({ where: { userId } });
  }
}
