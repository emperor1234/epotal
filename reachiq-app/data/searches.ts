import { api } from '../config/api';
import { ApiContact, ApiSearchQuery } from './api-types';

export type SearchFilters = {
  industry: string;
  country: string;
  seniority?: string;
  keywords?: string[];
  mode: 'quick' | 'full_directory';
};

export function createSearch(filters: SearchFilters, token: string) {
  return api.post<{ searchQuery: ApiSearchQuery }>('/searches', filters, token);
}

export function getSearch(id: string, token: string) {
  return api.get<{ searchQuery: ApiSearchQuery }>(`/searches/${id}`, token);
}

export function getSearchResults(id: string, token: string) {
  return api.get<{ status: ApiSearchQuery['status']; contacts: ApiContact[] }>(`/searches/${id}/results`, token);
}
