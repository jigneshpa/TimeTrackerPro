// Tennessee uses Central Time (America/Chicago)
export const APP_TIMEZONE = 'America/Chicago';

/**
 * Format date to local timezone string
 */
export function formatToLocalTimezone(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Get current date/time in Tennessee timezone
 */
export function getCurrentTimeInTimezone(): Date {
  // Get current time in Tennessee timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return now;
}

/**
 * Format time for display (12-hour format with AM/PM)
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Convert date to YYYY-MM-DD format in Tennessee timezone
 */
export function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Get hours worked between two times
 */
export function getHoursWorked(clockIn: string, clockOut: string, breakMinutes: number = 0): number {
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  const diff = end - start;
  const hours = diff / (1000 * 60 * 60);
  const breakHours = breakMinutes / 60;
  return Math.max(0, hours - breakHours);
}
