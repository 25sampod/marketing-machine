export interface StudioTimeOptions {
  timeFormat?: '12h' | '24h';
  timezone?: string;
}

export const COMMON_TIMEZONES = [
  { value: 'auto', label: 'Auto-Detect (Local System)' },
  { value: 'Asia/Dhaka', label: 'Dhaka (GMT+6)' },
  { value: 'Asia/Kolkata', label: 'India / New Delhi (GMT+5:30)' },
  { value: 'Asia/Dubai', label: 'Dubai / Gulf (GMT+4)' },
  { value: 'Asia/Singapore', label: 'Singapore / Hong Kong (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Europe/London', label: 'London / GMT (GMT+0 / BST)' },
  { value: 'Europe/Berlin', label: 'Berlin / Paris / CET (GMT+1)' },
  { value: 'America/New_York', label: 'New York / Eastern (GMT-5 / EDT)' },
  { value: 'America/Chicago', label: 'Chicago / Central (GMT-6 / CDT)' },
  { value: 'America/Denver', label: 'Denver / Mountain (GMT-7 / MDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles / Pacific (GMT-8 / PDT)' },
  { value: 'UTC', label: 'UTC (Universal Time)' },
];

/**
 * Formats a date string or Date object according to studio preferences:
 * - 12-hour: "12:39 PM" or "1:05 AM"
 * - 24-hour: "12:39" or "01:05"
 * - Localized to selected timezone or browser auto-detection
 */
export function formatStudioTime(
  dateInput: string | Date | null | undefined,
  options?: StudioTimeOptions
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const is12Hour = options?.timeFormat !== '24h';
  const tz = options?.timezone && options.timezone !== 'auto' ? options.timezone : undefined;

  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: is12Hour ? 'numeric' : '2-digit',
      minute: '2-digit',
      hour12: is12Hour,
      timeZone: tz,
    }).format(date);
  } catch (err) {
    // Fallback if custom timezone string fails
    try {
      return new Intl.DateTimeFormat('en-US', {
        hour: is12Hour ? 'numeric' : '2-digit',
        minute: '2-digit',
        hour12: is12Hour,
      }).format(date);
    } catch {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
}

/**
 * Formats date label (e.g. "Today", "Yesterday", or "Sep 10, 2026")
 */
export function formatStudioDate(
  dateInput: string | Date | null | undefined,
  options?: StudioTimeOptions
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const tz = options?.timezone && options.timezone !== 'auto' ? options.timezone : undefined;

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      timeZone: tz,
    }).format(date);
  } catch {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
