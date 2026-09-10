import crypto from 'crypto';

// In-memory deduplication cache with 24-hour TTL
const processedMessageIds = new Map<string, number>();

/**
 * Checks whether a WhatsApp message_id has already been processed within the TTL window.
 * If not duplicate, records the message ID and returns false.
 */
export function isDuplicateMessageId(messageId: string, ttlMs: number = 24 * 60 * 60 * 1000): boolean {
  if (!messageId) return false;
  const now = Date.now();
  const threshold = now - ttlMs;

  // Prune expired entries if map grows large
  if (processedMessageIds.size > 5000) {
    for (const [id, time] of processedMessageIds.entries()) {
      if (time < threshold) processedMessageIds.delete(id);
    }
  }

  if (processedMessageIds.has(messageId)) {
    return true;
  }
  processedMessageIds.set(messageId, now);
  return false;
}

/**
 * Helper to clear in-memory deduplication cache for testing
 */
export function resetDuplicateCacheForTesting(): void {
  processedMessageIds.clear();
}

/**
 * Cryptographically verifies Meta x-hub-signature-256 HMAC-SHA256 signature using timing-safe comparison.
 * Supports string or Buffer rawBody, case-insensitive 'sha256=' prefix, and hex formatting.
 */
export function verifyHmacSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  try {
    const trimmedHeader = signatureHeader.trim();
    if (!/^sha256=/i.test(trimmedHeader)) return false;

    const signatureHex = trimmedHeader.replace(/^sha256=\s*/i, '').trim();
    if (signatureHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(signatureHex)) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const expectedBuffer = Buffer.from(signatureHex, 'hex');
    const actualBuffer = hmac.digest();

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    console.error('[WhatsApp Webhook] Error verifying HMAC signature:', err);
    return false;
  }
}
