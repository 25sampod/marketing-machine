export interface MessageEditEligibility {
  canEdit: boolean;
  reason?: string;
  remainingMinutes?: number;
  elapsedMinutes?: number;
}

/**
 * Validates whether a message is eligible for editing.
 * Rules:
 * 1. Only outbound (studio-sent) messages can be edited (inbound client messages cannot).
 * 2. Must be within the edit time window (default: 15 minutes, matching WhatsApp Cloud API standards).
 */
export function checkMessageEditEligibility(
  message: { direction: string; sent_at: string | Date } | null | undefined,
  maxMinutes: number = 15,
  currentTimeMs: number = Date.now()
): MessageEditEligibility {
  if (!message) {
    return { canEdit: false, reason: 'Message not found.' };
  }

  if (message.direction !== 'outbound') {
    return {
      canEdit: false,
      reason: 'Inbound customer messages cannot be edited.',
    };
  }

  const sentTime = new Date(message.sent_at).getTime();
  if (isNaN(sentTime)) {
    return { canEdit: false, reason: 'Invalid sent timestamp.' };
  }

  const elapsedMs = currentTimeMs - sentTime;
  const elapsedMinutes = Math.max(0, elapsedMs / (1000 * 60));

  if (elapsedMinutes > maxMinutes) {
    return {
      canEdit: false,
      reason: `Message can only be edited within ${maxMinutes} minutes of sending. Sent ${Math.round(elapsedMinutes)} minutes ago.`,
      elapsedMinutes: Math.round(elapsedMinutes),
      remainingMinutes: 0,
    };
  }

  return {
    canEdit: true,
    remainingMinutes: Math.max(1, Math.round(maxMinutes - elapsedMinutes)),
    elapsedMinutes: Math.round(elapsedMinutes),
  };
}
