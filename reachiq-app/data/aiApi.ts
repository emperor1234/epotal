import { api } from '../config/api';

export function getAiKeyStatus(token: string) {
  return api.get<{ hasKey: boolean }>('/ai/key', token);
}

export function saveAiKey(apiKey: string, token: string) {
  return api.put<void>('/ai/key', { apiKey }, token);
}

export function deleteAiKey(token: string) {
  return api.delete<void>('/ai/key', token);
}
