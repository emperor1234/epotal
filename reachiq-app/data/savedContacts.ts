import { ApiContact } from './api-types';
import * as storage from '../lib/storage';

const KEY = 'reachiq.savedContacts';

export async function listSaved(): Promise<ApiContact[]> {
  const value = await storage.getItem(KEY);
  if (!value) return [];
  try {
    return JSON.parse(value) as ApiContact[];
  } catch {
    await storage.deleteItem(KEY);
    return [];
  }
}

export async function isSaved(id: string) {
  return (await listSaved()).some((contact) => contact.id === id);
}

export async function toggleSaved(contact: ApiContact) {
  const contacts = await listSaved();
  const exists = contacts.some((item) => item.id === contact.id);
  const next = exists ? contacts.filter((item) => item.id !== contact.id) : [contact, ...contacts];
  await storage.setItem(KEY, JSON.stringify(next));
  return !exists;
}
