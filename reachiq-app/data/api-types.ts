export type ApiCompany = {
  id: string;
  name: string;
  domain: string;
  industry: string | null;
  country: string | null;
  sizeRange: string | null;
};

export type ApiReveal = {
  id: string;
  userId: string;
  contactId: string;
  email: string;
  confidence: number;
  verificationStatus: 'valid' | 'invalid' | 'catch_all' | 'unknown';
  emailType: 'personal' | 'business' | 'unknown';
  sourceUrl: string | null;
  revealedAt: string;
};

export type ApiContact = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  seniority: string | null;
  companyId: string | null;
  companyNameHint: string | null;
  company: ApiCompany | null;
  country: string | null;
  industry: string | null;
  complianceTier: 'STANDARD' | 'CAUTION' | 'RESTRICTED';
  sourceType: string | null;
  sourceUrl: string | null;
  sourceCount: number;
  emailAvailability: 'unknown' | 'needs_company' | 'likely_work_email' | 'public_email' | 'verified_public_email' | 'verified';
  lastSeenAt: string;
  refreshedAt: string;
  createdAt: string;
  reveal?: ApiReveal | null;
};

export type ApiSearchQuery = {
  id: string;
  userId: string;
  filters: unknown;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  resultCount: number;
  createdAt: string;
};

export type ApiSummary = { text: string; source: 'ai' | 'template' };
