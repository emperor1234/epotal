import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';

export type ProxyIdentity = { ip: string; userAgent: string; sessionId: string };

// Minimal in-memory proxy pool placeholder. Swap for a real provider
// (residential proxy vendor, or your own rotating pool) by reimplementing
// this interface — nothing else in the ingestion layer depends on how
// identities are sourced (SYSTEM_DESIGN.md Section 3.1/6.1).
export interface ProxyPool {
  acquireIdentity(): Promise<ProxyIdentity>;
  discardCurrentIdentity(): Promise<void>;
}

const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];

class InMemoryProxyPool implements ProxyPool {
  private current: ProxyIdentity | null = null;

  async acquireIdentity(): Promise<ProxyIdentity> {
    if (!this.current) {
      this.current = this.roll();
    }
    return this.current;
  }

  async discardCurrentIdentity(): Promise<void> {
    this.current = this.roll();
  }

  private roll(): ProxyIdentity {
    return {
      ip: `0.0.0.0`,
      userAgent: DEFAULT_USER_AGENTS[Math.floor(Math.random() * DEFAULT_USER_AGENTS.length)],
      sessionId: Math.random().toString(36).slice(2),
    };
  }
}

export class ProxiedHttpClient {
  constructor(private readonly proxyPool: ProxyPool = new InMemoryProxyPool()) {}

  async fetch(url: string, opts: { renderJs?: boolean } = {}): Promise<string> {
    const identity = await this.proxyPool.acquireIdentity();
    await this.politeDelay();
    return opts.renderJs ? this.fetchViaHeadlessBrowser(url, identity) : this.fetchPlain(url, identity);
  }

  async rotateIdentity(): Promise<void> {
    await this.proxyPool.discardCurrentIdentity();
  }

  private async politeDelay(): Promise<void> {
    const { SCRAPE_DELAY_MIN_MS: min, SCRAPE_DELAY_MAX_MS: max } = env;
    await new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
  }

  private async fetchPlain(url: string, identity: ProxyIdentity): Promise<string> {
    const response = await fetch(url, {
      headers: { 'User-Agent': identity.userAgent },
    });
    if (!response.ok) {
      logger.warn({ url, status: response.status }, 'Non-OK response from scrape target');
    }
    return response.text();
  }

  private async fetchViaHeadlessBrowser(url: string, _identity: ProxyIdentity): Promise<string> {
    // JS-rendered pages (e.g. Google Maps' scroll-paginated SPA) need a real
    // headless browser (Playwright/Puppeteer) wired up per deployment target —
    // deliberately not bundled here to keep this service's footprint light.
    // See SYSTEM_DESIGN.md Section 6.1 (GoogleMapsIngestionSource).
    throw new Error(`renderJs fetch not implemented — wire up Playwright/Puppeteer for: ${url}`);
  }
}
