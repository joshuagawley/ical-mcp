// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

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

  test('parses all-day events (date only, no time)', () => {
    const ics = `BEGIN:VEVENT
UID:allday-123@example.com
SUMMARY:Holiday
DTSTART;VALUE=DATE:20240101
DTEND;VALUE=DATE:20240102
END:VEVENT`;

    const event = parseICS(ics);

    expect(event).not.toBeNull();
    expect(event?.dtstart).toBe('2024-01-01T00:00:00Z');
    expect(event?.dtend).toBe('2024-01-02T00:00:00Z');
  });

  test('parses event with timezone parameter', () => {
    const ics = `BEGIN:VEVENT
UID:tz-123@example.com
SUMMARY:Meeting with TZ
DTSTART;TZID=America/New_York:20240115T100000
DTEND;TZID=America/New_York:20240115T110000
END:VEVENT`;

    const event = parseICS(ics);

    // Parser extracts time, assumes UTC (timezone conversion is caller's responsibility)
    expect(event).not.toBeNull();
    expect(event?.dtstart).toBe('2024-01-15T10:00:00Z');
    expect(event?.dtend).toBe('2024-01-15T11:00:00Z');
  });

  test('handles escaped characters in summary', () => {
    const ics = `BEGIN:VEVENT
UID:escaped-123@example.com
SUMMARY:Meeting\\, Planning\\, and Review
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT`;

    const event = parseICS(ics);

    expect(event?.summary).toBe('Meeting, Planning, and Review');
  });

  test('handles escaped newlines in description', () => {
    const ics = `BEGIN:VEVENT
UID:multiline-123@example.com
SUMMARY:Event
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
DESCRIPTION:Line 1\\nLine 2\\nLine 3
END:VEVENT`;

    const event = parseICS(ics);

    expect(event?.description).toBe('Line 1\nLine 2\nLine 3');
  });

  test('handles escaped backslashes', () => {
    // In iCal, \\ represents a single backslash
    // In JS template literal, we need \\\\ to represent \\ in the iCal data
    const ics = `BEGIN:VEVENT
UID:backslash-123@example.com
SUMMARY:Path\\\\test
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT`;

    const event = parseICS(ics);

    expect(event?.summary).toBe('Path\\test');
  });

  test('parses recurrence-id for recurring event instance', () => {
    const ics = `BEGIN:VEVENT
UID:recurring-modified@example.com
SUMMARY:Modified Instance
DTSTART:20240122T090000Z
DTEND:20240122T091500Z
RECURRENCE-ID:20240122T090000Z
RRULE:FREQ=WEEKLY
END:VEVENT`;

    const event = parseICS(ics);

    expect(event?.isRecurring).toBe(true);
    expect(event?.recurrenceId).toBe('20240122T090000Z');
  });

  test('handles empty optional fields gracefully', () => {
    const ics = `BEGIN:VEVENT
UID:minimal-123@example.com
SUMMARY:Minimal Event
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
LOCATION:
DESCRIPTION:
END:VEVENT`;

    const event = parseICS(ics);

    expect(event).not.toBeNull();
    // Empty strings should be treated as undefined/missing
    expect(event?.location).toBeFalsy();
    expect(event?.description).toBeFalsy();
  });

  test('parses event with CRLF line endings', () => {
    const ics =
      'BEGIN:VEVENT\r\nUID:crlf-123@example.com\r\nSUMMARY:CRLF Event\r\nDTSTART:20240115T100000Z\r\nDTEND:20240115T110000Z\r\nEND:VEVENT';

    const event = parseICS(ics);

    expect(event).not.toBeNull();
    expect(event?.summary).toBe('CRLF Event');
  });

  test('handles folded lines (continuation with space)', () => {
    const ics = `BEGIN:VEVENT
UID:folded-123@example.com
SUMMARY:This is a very long summary that has been folded across multiple
 lines according to the iCalendar spec
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT`;

    const event = parseICS(ics);

    expect(event?.summary).toContain('very long summary');
    expect(event?.summary).toContain('multiple');
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
