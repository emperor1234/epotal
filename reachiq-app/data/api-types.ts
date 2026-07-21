export type ApiCompany = {
  id: string;
  name: string;
  domain: string;
  industry: string | null;
  country: string | null;
  sizeRange: string | null;
};

export type ApiContact = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  seniority: string | null;
  companyId: string | null;
  company: ApiCompany | null;
  country: string | null;
  industry: string | null;
  complianceTier: 'STANDARD' | 'CAUTION' | 'RESTRICTED';
  sourceType: string | null;
  sourceUrl: string | null;
  createdAt: string;
};

export type ApiReveal = {
  id: string;
  userId: string;
  contactId: string;
  email: string;
  confidence: number;
  verificationStatus: 'valid' | 'invalid' | 'catch_all' | 'unknown';
  revealedAt: string;
};

export type ApiSearchQuery = {
  id: string;
  userId: string;
  filters: unknown;
  status: 'queued' | 'running' | 'completed' | 'failed';
  resultCount: number;
  createdAt: string;
};

export type ApiSummary = { text: string; source: 'ai' | 'template' };
