/**
 * iCal (.ics) builder
 * Constructs VCALENDAR/VEVENT components for CalDAV PUT requests
 */

interface EventInput {
  readonly uid?: string;
  readonly summary: string;
  readonly dtstart: string; // ISO 8601
  readonly dtend: string; // ISO 8601
  readonly location?: string;
  readonly description?: string;
}

/**
 * Build a complete iCal string for a single event
 */
export function buildICS(event: EventInput): string {
  const uid = event.uid ?? generateUID();
  const now = formatICalDate(new Date().toISOString());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ical-mcp//Apple Calendar MCP//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatICalDate(event.dtstart)}`,
    `DTEND:${formatICalDate(event.dtend)}`,
    `SUMMARY:${escapeICalText(event.summary)}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  // iCal uses CRLF line endings
  return lines.join('\r\n') + '\r\n';
}

/**
 * Generate a unique identifier for an event
 */
function generateUID(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}@ical-mcp`;
}

/**
 * Convert ISO 8601 date to iCal format (YYYYMMDDTHHmmssZ)
 */
function formatICalDate(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

/**
 * Escape special characters for iCal text values
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}
