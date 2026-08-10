import axios from 'axios';
import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { redis } from '../../../lib/redis';

export type VerificationStatus = 'valid' | 'invalid' | 'catch_all' | 'unknown';
export interface VerificationResult {
  status: VerificationStatus;
  reason?: string;
}

interface ReacherResponse {
  is_reachable?: 'safe' | 'risky' | 'invalid' | 'unknown';
  syntax?: { is_valid_syntax?: boolean };
  mx?: { accepts_mail?: boolean };
  smtp?: {
    is_catch_all?: boolean;
    is_deliverable?: boolean;
    is_disabled?: boolean;
    has_full_inbox?: boolean;
  };
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
    if (env.REACHER_URL) {
      const reacherResult = await this.callReacher(email);
      if (reacherResult.status !== 'unknown' || !env.ZEROBOUNCE_API_KEY) {
        return reacherResult;
      }
    }

    if (env.ZEROBOUNCE_API_KEY) return this.callZeroBounce(email);

    // No provider configured — fail open rather than block the pipeline.
    return { status: 'unknown', reason: 'verification_provider_not_configured' };
  }

  private async callReacher(email: string): Promise<VerificationResult> {
    try {
      const endpoint = `${env.REACHER_URL.replace(/\/$/, '')}/v0/check_email`;
      const { data } = await axios.post<ReacherResponse>(endpoint, { to_email: email }, {
        timeout: 15_000,
      });
      return this.mapReacherStatus(data);
    } catch (err) {
      logger.warn({ email, err }, 'Reacher verification provider error');
      return { status: 'unknown', reason: 'reacher_unavailable' };
    }
  }

  private mapReacherStatus(data: ReacherResponse): VerificationResult {
    if (data.syntax?.is_valid_syntax === false) {
      return { status: 'invalid', reason: 'invalid_syntax' };
    }
    if (data.mx?.accepts_mail === false) {
      return { status: 'invalid', reason: 'domain_does_not_accept_mail' };
    }
    if (data.smtp?.is_catch_all) return { status: 'catch_all' };
    if (data.is_reachable === 'safe' || data.smtp?.is_deliverable === true) {
      return { status: 'valid' };
    }
    if (data.is_reachable === 'invalid' || data.smtp?.is_disabled || data.smtp?.has_full_inbox) {
      return { status: 'invalid', reason: data.smtp?.is_disabled ? 'mailbox_disabled' : 'mailbox_unreachable' };
    }
    return { status: 'unknown', reason: `reacher_${data.is_reachable ?? 'unknown'}` };
  }

  private async callZeroBounce(email: string): Promise<VerificationResult> {
    try {
      const { data } = await axios.get('https://api.zerobounce.net/v2/validate', {
        params: { api_key: env.ZEROBOUNCE_API_KEY, email },
        timeout: 5000,
      });
      return this.mapZeroBounceStatus(data.status, data.sub_status);
    } catch (err) {
      logger.warn({ email, err }, 'ZeroBounce verification provider error');
      return { status: 'unknown', reason: 'zerobounce_unavailable' };
    }
  }

  private mapZeroBounceStatus(status: string, subStatus: string): VerificationResult {
    if (status === 'valid') return { status: 'valid' };
    if (status === 'catch-all') return { status: 'catch_all' };
    if (status === 'invalid') return { status: 'invalid', reason: subStatus };
    return { status: 'unknown', reason: subStatus };
  }
}
