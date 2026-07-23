import { api } from '../config/api';

export type SuppressionEntry = {
  id: string;
  email: string;
  reason: string;
  createdAt: string;
};

export function listSuppressions(token: string) {
  return api.get<{ entries: SuppressionEntry[] }>('/suppression', token);
}

export function addSuppression(email: string, reason: string, token: string) {
  return api.post<{ entry: SuppressionEntry }>('/suppression', { email, reason }, token);
}

export function removeSuppression(email: string, token: string) {
  return api.delete<void>(`/suppression/${encodeURIComponent(email)}`, token);
}
