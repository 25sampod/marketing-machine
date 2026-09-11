import { supabaseAdmin } from './supabase';
import { resolveStudioCredentials, StudioSettingsCredentials } from './settingsResolver';

export type { StudioSettingsCredentials };
export { resolveStudioCredentials };

export interface GetStudioSettingsOptions {
  studioId?: string;
  teamId?: string;
  forceRefresh?: boolean;
}

interface CacheEntry {
  data: StudioSettingsCredentials;
  expiresAt: number;
}

const settingsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5000; // 5-second TTL for fast responsiveness on dashboard changes

/**
 * Resolves integration credentials and policies from `public.studio_settings` in Supabase Postgres,
 * seamlessly falling back to `process.env` when database columns are empty.
 * Supports multi-tenant lookups by `teamId` or `studioId`, falling back to the default studio row.
 */
export async function getStudioSettings(
  optionsOrForceRefresh: GetStudioSettingsOptions | boolean = false
): Promise<StudioSettingsCredentials> {
  const options: GetStudioSettingsOptions =
    typeof optionsOrForceRefresh === 'boolean'
      ? { forceRefresh: optionsOrForceRefresh }
      : optionsOrForceRefresh || {};

  const cacheKey = options.teamId
    ? `team:${options.teamId}`
    : options.studioId
    ? `studio:${options.studioId}`
    : 'default';

  const now = Date.now();
  const cached = settingsCache.get(cacheKey);
  if (!options.forceRefresh && cached && now < cached.expiresAt) {
    return cached.data;
  }

  let db: Record<string, any> | null = null;

  try {
    let query = supabaseAdmin.from('studio_settings').select('*');

    if (options.teamId) {
      query = query.eq('team_id', options.teamId);
    } else if (options.studioId) {
      query = query.eq('id', options.studioId);
    } else {
      query = query.eq('id', 'default');
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      db = data;
    } else if (options.teamId || (options.studioId && options.studioId !== 'default')) {
      // If team or studio specific row not found, fall back to the primary default row
      const { data: defaultData } = await supabaseAdmin
        .from('studio_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (defaultData) {
        db = defaultData;
      }
    }
  } catch (err) {
    console.warn('[StudioSettings] Warning: Failed to load studio_settings from database, falling back to env:', err);
  }

  const resolved = resolveStudioCredentials(db, process.env);

  settingsCache.set(cacheKey, {
    data: resolved,
    expiresAt: now + CACHE_TTL_MS,
  });

  return resolved;
}

/**
 * Invalidates the in-memory cache so subsequent reads immediately reflect DB updates.
 * Optionally invalidate a specific cache key.
 */
export function clearSettingsCache(key?: string): void {
  if (key) {
    settingsCache.delete(key);
  } else {
    settingsCache.clear();
  }
}
