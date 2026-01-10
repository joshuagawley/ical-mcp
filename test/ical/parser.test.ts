/**
 * Tests for iCal parser
 */

import { describe, expect, test } from 'bun:test';

import { parseICS, parseMultipleICS } from '../../src/ical/parser';

describe('parseICS', () => {
  test('parses a basic VEVENT', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-123@example.com
SUMMARY:Team Meeting
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT
END:VCALENDAR`;

    const event = parseICS(ics);

    expect(event).not.toBeNull();
    expect(event?.uid).toBe('test-123@example.com');
    expect(event?.summary).toBe('Team Meeting');
    expect(event?.dtstart).toBe('2024-01-15T10:00:00Z');
    expect(event?.dtend).toBe('2024-01-15T11:00:00Z');
    expect(event?.isRecurring).toBe(false);
  });

  test('parses event with location and description', () => {
    const ics = `BEGIN:VEVENT
UID:test-456@example.com
SUMMARY:Project Review
DTSTART:20240120T140000Z
DTEND:20240120T150000Z
LOCATION:Conference Room A
DESCRIPTION:Quarterly review meeting
END:VEVENT`;

    const event = parseICS(ics);

    expect(event?.location).toBe('Conference Room A');
    expect(event?.description).toBe('Quarterly review meeting');
  });

  test('detects recurring events', () => {
    const ics = `BEGIN:VEVENT
UID:recurring-123@example.com
SUMMARY:Weekly Standup
DTSTART:20240115T090000Z
DTEND:20240115T091500Z
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR
END:VEVENT`;

    const event = parseICS(ics);

    expect(event?.isRecurring).toBe(true);
  });

  test('returns null for invalid input', () => {
    expect(parseICS('')).toBeNull();
    expect(parseICS('not ical data')).toBeNull();
    expect(parseICS('BEGIN:VEVENT\nEND:VEVENT')).toBeNull(); // Missing required fields
  });
});

describe('parseMultipleICS', () => {
  test('parses multiple events from a single ics string', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-1@example.com
SUMMARY:Event One
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT
BEGIN:VEVENT
UID:event-2@example.com
SUMMARY:Event Two
DTSTART:20240116T100000Z
DTEND:20240116T110000Z
END:VEVENT
END:VCALENDAR`;

    const events = parseMultipleICS(ics);

    expect(events).toHaveLength(2);
    expect(events[0]?.summary).toBe('Event One');
    expect(events[1]?.summary).toBe('Event Two');
  });
});
