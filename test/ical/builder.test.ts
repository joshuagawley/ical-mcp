// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for iCal builder
 */

import { describe, expect, test } from 'bun:test';

import { buildICS } from '../../src/ical/builder';

describe('buildICS', () => {
  test('builds a basic VCALENDAR with VEVENT', () => {
    const ics = buildICS({
      uid: 'test-123',
      summary: 'Test Event',
      dtstart: '2024-01-15T10:00:00Z',
      dtend: '2024-01-15T11:00:00Z',
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('UID:test-123');
    expect(ics).toContain('SUMMARY:Test Event');
    expect(ics).toContain('DTSTART:20240115T100000Z');
    expect(ics).toContain('DTEND:20240115T110000Z');
  });

  test('includes location when provided', () => {
    const ics = buildICS({
      summary: 'Meeting',
      dtstart: '2024-01-15T10:00:00Z',
      dtend: '2024-01-15T11:00:00Z',
      location: 'Room 101',
    });

    expect(ics).toContain('LOCATION:Room 101');
  });

  test('includes description when provided', () => {
    const ics = buildICS({
      summary: 'Meeting',
      dtstart: '2024-01-15T10:00:00Z',
      dtend: '2024-01-15T11:00:00Z',
      description: 'Discuss project status',
    });

    expect(ics).toContain('DESCRIPTION:Discuss project status');
  });

  test('escapes special characters', () => {
    const ics = buildICS({
      summary: 'Meeting, with commas',
      dtstart: '2024-01-15T10:00:00Z',
      dtend: '2024-01-15T11:00:00Z',
      description: 'Line 1\nLine 2',
    });

    expect(ics).toContain('SUMMARY:Meeting\\, with commas');
    expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2');
  });

  test('generates UID when not provided', () => {
    const ics = buildICS({
      summary: 'Event',
      dtstart: '2024-01-15T10:00:00Z',
      dtend: '2024-01-15T11:00:00Z',
    });

    expect(ics).toMatch(/UID:[a-z0-9]+-[a-z0-9]+@ical-mcp/);
  });

  test('uses CRLF line endings', () => {
    const ics = buildICS({
      summary: 'Event',
      dtstart: '2024-01-15T10:00:00Z',
      dtend: '2024-01-15T11:00:00Z',
    });

    expect(ics).toContain('\r\n');
    expect(ics).not.toMatch(/[^\r]\n/); // No bare LF
  });
});
