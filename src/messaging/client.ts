import type { RuntimeRequest, RuntimeResponse } from './schema';
import type { StoredDatabase } from '../models/types';

export interface MessageResult {
  data: StoredDatabase;
  warnings: string[];
}

export async function sendMessageWithMeta(request: RuntimeRequest): Promise<MessageResult> {
  const response = await chrome.runtime.sendMessage<RuntimeRequest, RuntimeResponse>(request);
  if (!response?.ok) throw new Error(response?.error.message ?? 'ResultBoard did not respond.');
  return { data: response.data, warnings: response.warnings ?? [] };
}

export async function sendMessage(request: RuntimeRequest): Promise<StoredDatabase> {
  return (await sendMessageWithMeta(request)).data;
}
