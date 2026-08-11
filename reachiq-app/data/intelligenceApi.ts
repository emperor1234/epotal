import { api } from '../config/api';
import { ApiContact, ApiSearchQuery } from './api-types';

export type BulkEnrichmentRecord = {
  fullName: string;
  jobTitle?: string;
  companyName?: string;
  companyDomain?: string;
  country?: string;
  industry?: string;
  sourceUrl: string;
};

export function findDecisionMakers(input: { company?: string; industry?: string; country: string; roles: string[] }, token: string) {
  return api.post<{ searchQuery: ApiSearchQuery }>('/intelligence/decision-makers', input, token);
}

export function bulkEnrich(records: BulkEnrichmentRecord[], token: string) {
  return api.post<{ contacts: ApiContact[]; imported: number }>('/intelligence/bulk-enrich', { records }, token);
}
