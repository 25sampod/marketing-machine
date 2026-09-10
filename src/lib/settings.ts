import { supabaseAdmin } from './supabase';
import { resolveStudioCredentials, StudioSettingsCredentials } from './settingsResolver';

export type { StudioSettingsCredentials };
export { resolveStudioCredentials };

let cachedSettings: StudioSettingsCredentials | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5000; // 5-second TTL for fast responsiveness on dashboard changes

/**
 * Resolves integration credentials and policies from `public.studio_settings` in Supabase Postgres,
 * seamlessly falling back to `process.env` when database columns are empty.
 */
export async function getStudioSettings(forceRefresh = false): Promise<StudioSettingsCredentials> {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && now < cacheExpiresAt) {
    return cachedSettings;
  }

  let db: Record<string, any> | null = null;

  try {
    const { data, error } = await supabaseAdmin
      .from('studio_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (!error && data) {
      db = data;
    }
  } catch (err) {
    console.warn('[StudioSettings] Warning: Failed to load studio_settings from database, falling back to env:', err);
  }

  const resolved = resolveStudioCredentials(db, process.env);

  cachedSettings = resolved;
  cacheExpiresAt = now + CACHE_TTL_MS;

  return resolved;
}

/**
 * Invalidates the in-memory cache so subsequent reads immediately reflect DB updates.
 */
export function clearSettingsCache(): void {
  cachedSettings = null;
  cacheExpiresAt = 0;
}
