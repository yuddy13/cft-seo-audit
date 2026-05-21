import { getDb } from './db';
import { decrypt } from './crypto';

export function getDecryptedKey(): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'openrouter_key_enc'").get() as { value: string } | undefined;
  if (!row?.value) throw new Error('No OpenRouter API key configured');
  return decrypt(row.value);
}
