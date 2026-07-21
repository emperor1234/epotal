import { api } from '../config/api';
import { ApiContact, ApiReveal, ApiSummary } from './api-types';

export function getContact(id: string, token: string) {
  return api.get<{ contact: ApiContact }>(`/contacts/${id}`, token);
}

export function getContactSummary(id: string, token: string) {
  return api.get<{ summary: ApiSummary }>(`/contacts/${id}/summary`, token);
}

export function revealContact(id: string, token: string) {
  return api.post<{ reveal: ApiReveal }>(`/contacts/${id}/reveal`, undefined, token);
}
