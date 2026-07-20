import axios from 'axios';
import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { redis } from '../../../lib/redis';

export type VerificationStatus = 'valid' | 'invalid' | 'catch_all' | 'unknown';
export interface VerificationResult {
  status: VerificationStatus;
  reason?: string;
}

const TTL_BY_STATUS: Record<VerificationStatus, number> = {
  valid: 60 * 60 * 24 * 30, // 30 days — verified addresses rarely change
  invalid: 60 * 60 * 24 * 30,
  catch_all: 60 * 60 * 24 * 7,
  unknown: 60 * 60 * 6, // retry sooner — could be a transient provider hiccup
};

export class EmailVerificationService {
  async verify(email: string): Promise<VerificationResult> {
    const cacheKey = `email-verify:${email.toLowerCase()}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as VerificationResult;

    const result = await this.callProvider(email);
    await redis.set(cacheKey, JSON.stringify(result), 'EX', TTL_BY_STATUS[result.status]);
    return result;
  }

  private async callProvider(email: string): Promise<VerificationResult> {
    if (!env.ZEROBOUNCE_API_KEY) {
      // No provider configured — fail open rather than block the pipeline.
      return { status: 'unknown', reason: 'verification_provider_not_configured' };
    }

    try {
      const { data } = await axios.get('https://api.zerobounce.net/v2/validate', {
        params: { api_key: env.ZEROBOUNCE_API_KEY, email },
        timeout: 5000,
      });
      return this.mapStatus(data.status, data.sub_status);
    } catch (err) {
      logger.warn({ email, err }, 'Verification provider error');
      // Fail open to 'unknown' rather than blocking the whole discovery
      // pipeline on a verification-provider outage.
      return { status: 'unknown', reason: 'verification_service_unavailable' };
    }
  }

  private mapStatus(status: string, subStatus: string): VerificationResult {
    if (status === 'valid') return { status: 'valid' };
    if (status === 'catch-all') return { status: 'catch_all' };
    if (status === 'invalid') return { status: 'invalid', reason: subStatus };
    return { status: 'unknown', reason: subStatus };
  }
}
