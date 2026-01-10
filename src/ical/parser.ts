// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * iCal (.ics) parser
 * Parses VEVENT components from iCalendar data
 */

import type { CalendarEvent } from '../types';

/**
 * Parse an iCal string to extract event data
 */
export function parseICS(icsString: string): CalendarEvent | null {
  // Find VEVENT block
  const veventMatch = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/i.exec(icsString);
  if (!veventMatch?.[1]) {
    return null;
  }

  const vevent = veventMatch[1];

  const uid = extractProperty(vevent, 'UID');
  const summary = extractProperty(vevent, 'SUMMARY');
  const dtstart = extractProperty(vevent, 'DTSTART');
  const dtend = extractProperty(vevent, 'DTEND');

  if (!uid || !summary || !dtstart || !dtend) {
    return null;
  }

  const location = extractProperty(vevent, 'LOCATION');
  const description = extractProperty(vevent, 'DESCRIPTION');
  const recurrenceId = extractProperty(vevent, 'RECURRENCE-ID');

  return {
    uid,
    summary,
    dtstart: parseICalDate(dtstart),
    dtend: parseICalDate(dtend),
    ...(location ? { location } : {}),
    ...(description ? { description } : {}),
    isRecurring: vevent.includes('RRULE:'),
    ...(recurrenceId ? { recurrenceId } : {}),
  };
}

/**
 * Parse multiple events from an iCal string
 */
export function parseMultipleICS(icsString: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const veventRegex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/gi;
  let match;

  while ((match = veventRegex.exec(icsString)) !== null) {
    const event = parseICS(match[0]);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Extract a property value from VEVENT content
 * Handles folded lines and parameters
 */
function extractProperty(vevent: string, propertyName: string): string | null {
  // Match property with optional parameters (e.g., DTSTART;TZID=America/New_York:20240115T100000)
  const regex = new RegExp(`^${propertyName}[;:]([^\\r\\n]*)`, 'im');
  const match = regex.exec(vevent);

  if (!match?.[1]) {
    return null;
  }

  let value = match[1];

  // If there are parameters (contains :), extract the value after the last :
  if (value.includes(':')) {
    const colonIndex = value.lastIndexOf(':');
    value = value.substring(colonIndex + 1);
  }

  // Unfold continuation lines (lines starting with space or tab)
  value = value.replace(/\r?\n[ \t]/g, '');

  // Unescape special characters
  value = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\');

  return value.trim();
}

/**
 * Convert iCal date format to ISO 8601 UTC string
 * Handles: 20240115T100000Z, 20240115T100000, 20240115
 */
function parseICalDate(icalDate: string): string {
  // Already in UTC (ends with Z)
  if (icalDate.endsWith('Z')) {
    const year = icalDate.substring(0, 4);
    const month = icalDate.substring(4, 6);
    const day = icalDate.substring(6, 8);
    const hour = icalDate.substring(9, 11);
    const minute = icalDate.substring(11, 13);
    const second = icalDate.substring(13, 15);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  }

  // Date-time without timezone (assume UTC for now)
  if (icalDate.includes('T')) {
    const year = icalDate.substring(0, 4);
    const month = icalDate.substring(4, 6);
    const day = icalDate.substring(6, 8);
    const hour = icalDate.substring(9, 11);
    const minute = icalDate.substring(11, 13);
    const second = icalDate.substring(13, 15) || '00';
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  }

  // Date only (all-day event)
  const year = icalDate.substring(0, 4);
  const month = icalDate.substring(4, 6);
  const day = icalDate.substring(6, 8);
  return `${year}-${month}-${day}T00:00:00Z`;
}
