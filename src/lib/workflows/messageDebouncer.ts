import { supabaseAdmin } from '../supabase.ts';

export interface DebounceQueueItem {
  leadId: string;
  contact: string;
  source: string;
  version: number;
  timer: NodeJS.Timeout | null;
  inFlight: boolean;
  abortController: AbortController | null;
  lastMessageId?: string | null;
}

// In-memory debounce queue keyed by leadId
const debounceQueue = new Map<string, DebounceQueueItem>();

export const DEFAULT_DEBOUNCE_DELAY_MS = 2500; // 2.5 seconds natural conversational pause

/**
 * Pure helper to coalesce consecutive unreplied inbound messages.
 * Stops at the most recent outbound reply and preserves chronological order.
 */
export function coalesceInboundMessages(
  messages: Array<{ direction: string; content?: string | null }>
): string {
  if (!messages || messages.length === 0) return '';

  const unrepliedInbound: string[] = [];
  for (const msg of messages) {
    if (msg.direction === 'outbound') {
      // Reached boundary of previous assistant response
      break;
    }
    if (msg.direction === 'inbound' && msg.content && msg.content.trim()) {
      unrepliedInbound.push(msg.content.trim());
    }
  }

  if (unrepliedInbound.length === 0) {
    return messages[0]?.content?.trim() || '';
  }

  // Reverse so they are in chronological order (oldest to newest among unreplied batch)
  unrepliedInbound.reverse();
  return unrepliedInbound.join('\n');
}

/**
 * Fetch all un-replied inbound messages for a given lead from the database.
 */
export async function fetchUnrepliedInboundMessages(leadId: string): Promise<string> {
  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('id, direction, content, sent_at')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(20);

  if (error || !messages || messages.length === 0) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('message')
      .eq('id', leadId)
      .maybeSingle();
    return lead?.message || '';
  }

  return coalesceInboundMessages(messages);
}

/**
 * Enqueue an inbound message for debouncing, multi-message coalescing, and in-flight preemption.
 * If subsequent messages arrive within the debounce delay or while the AI is in-flight,
 * they coalesce into a single response, preempting stale in-flight work.
 */
export async function enqueueInboundMessage(params: {
  leadId: string;
  contact: string;
  source: string;
  messageText?: string;
  messageId?: string;
  debounceMs?: number;
}): Promise<void> {
  const { leadId, contact, source, messageId } = params;
  const debounceMs = params.debounceMs ?? DEFAULT_DEBOUNCE_DELAY_MS;

  let entry = debounceQueue.get(leadId);

  if (!entry) {
    entry = {
      leadId,
      contact,
      source,
      version: 1,
      timer: null,
      inFlight: false,
      abortController: null,
      lastMessageId: messageId,
    };
    debounceQueue.set(leadId, entry);
  } else {
    entry.contact = contact;
    entry.source = source;
    if (messageId) {
      entry.lastMessageId = messageId;
    }

    // 1. If a debounce timer is currently running, cancel it (debounce reset)
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }

    // 2. If an AI qualification is currently in-flight, immediately preempt it!
    if (entry.inFlight && entry.abortController) {
      console.log(
        `[MessageDebouncer] Preempting in-flight AI generation for lead ${leadId} (version ${entry.version}) due to new inbound message`
      );
      entry.abortController.abort();
      entry.abortController = null;
      entry.inFlight = false;
    }

    // Bump version so any superseded in-flight execution knows it is stale
    entry.version += 1;
  }

  // 3. Immediately broadcast typing indicator to dashboard & native Meta channel
  try {
    const typingChannel = supabaseAdmin.channel(`chat:${leadId}`);
    await typingChannel.send({
      type: 'broadcast',
      event: 'ai_typing',
      payload: { leadId, isTyping: true, timestamp: Date.now() },
    });
    await supabaseAdmin.removeChannel(typingChannel);

    if (source === 'whatsapp' && messageId) {
      const { sendWhatsAppTypingIndicator } = await import('../whatsapp/api.ts');
      await sendWhatsAppTypingIndicator(messageId);
    }
  } catch (err) {
    console.warn(`[MessageDebouncer] Failed to broadcast typing indicator for lead ${leadId}:`, err);
  }

  const currentVersion = entry.version;

  // 4. Arm debounce timer
  entry.timer = setTimeout(async () => {
    await executeCoalescedJob(leadId, currentVersion);
  }, debounceMs);
}

/**
 * Executes the coalesced lead pipeline when the debounce timer fires without new interruptions.
 */
export async function executeCoalescedJob(leadId: string, scheduledVersion: number): Promise<void> {
  const entry = debounceQueue.get(leadId);
  if (!entry) return;

  // Verify that this timer has not been superseded by a newer message
  if (entry.version !== scheduledVersion) {
    console.log(
      `[MessageDebouncer] Skipping execution for lead ${leadId}: version ${scheduledVersion} superseded by ${entry.version}`
    );
    return;
  }

  // Mark in-flight and set up AbortController for preemption
  entry.timer = null;
  entry.inFlight = true;
  entry.abortController = new AbortController();
  const signal = entry.abortController.signal;

  try {
    // 1. Fetch un-replied inbound messages from DB
    const coalescedContent = await fetchUnrepliedInboundMessages(leadId);

    // If aborted during message fetching
    if (signal.aborted || entry.version !== scheduledVersion) {
      console.log(`[MessageDebouncer] Execution for lead ${leadId} preempted during message fetch.`);
      return;
    }

    console.log(
      `[MessageDebouncer] Dispatching coalesced AI run for lead ${leadId} (version ${scheduledVersion}):\n"${coalescedContent}"`
    );

    // 2. Call pipeline orchestrator
    const { processNewLead } = await import('./processNewLead.ts');
    await processNewLead(
      leadId,
      coalescedContent,
      entry.contact,
      entry.source,
      {
        version: scheduledVersion,
        signal,
        checkIsActive: () => {
          const current = debounceQueue.get(leadId);
          return current !== undefined && current.version === scheduledVersion && !signal.aborted;
        },
      }
    );
  } catch (error: any) {
    if (signal.aborted || error?.name === 'AbortError' || error?.name === 'APIUserAbortError') {
      console.log(`[MessageDebouncer] Execution for lead ${leadId} (version ${scheduledVersion}) cleanly preempted.`);
    } else {
      console.error(`[MessageDebouncer] Error in executeCoalescedJob for lead ${leadId}:`, error);
    }
  } finally {
    // Clean up in-flight state if still active version
    const current = debounceQueue.get(leadId);
    if (current && current.version === scheduledVersion) {
      current.inFlight = false;
      current.abortController = null;
      if (!current.timer) {
        debounceQueue.delete(leadId);
      }
    }
  }
}

/**
 * Inspection and testing helpers
 */
export function getDebounceQueueStatus(leadId: string): DebounceQueueItem | undefined {
  return debounceQueue.get(leadId);
}

export function resetDebounceQueueForTesting(): void {
  for (const entry of debounceQueue.values()) {
    if (entry.timer) clearTimeout(entry.timer);
    if (entry.abortController) entry.abortController.abort();
  }
  debounceQueue.clear();
}
