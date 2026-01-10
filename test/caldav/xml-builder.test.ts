// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for CalDAV XML builder
 */

import { describe, expect, test } from 'bun:test';

import {
  buildCalendarDiscovery,
  buildCalendarList,
  buildTimeRangeQuery,
} from '../../src/caldav/xml-builder';

describe('buildCalendarDiscovery', () => {
  test('builds valid XML with correct namespaces', () => {
    const xml = buildCalendarDiscovery();

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns:d="DAV:"');
    expect(xml).toContain('xmlns:c="urn:ietf:params:xml:ns:caldav"');
  });

  test('requests displayname property', () => {
    const xml = buildCalendarDiscovery();

    expect(xml).toContain('<d:displayname/>');
  });

  test('requests resourcetype property', () => {
    const xml = buildCalendarDiscovery();

    expect(xml).toContain('<d:resourcetype/>');
  });

  test('requests calendar-home-set property', () => {
    const xml = buildCalendarDiscovery();

    expect(xml).toContain('<c:calendar-home-set/>');
  });
});

describe('buildCalendarList', () => {
  test('builds valid XML with Apple namespace for color', () => {
    const xml = buildCalendarList();

    expect(xml).toContain('xmlns:x="http://apple.com/ns/ical/"');
  });

  test('requests calendar-color property', () => {
    const xml = buildCalendarList();

    expect(xml).toContain('<x:calendar-color/>');
  });

  test('is a PROPFIND request', () => {
    const xml = buildCalendarList();

    expect(xml).toContain('<d:propfind');
    expect(xml).toContain('</d:propfind>');
  });
});

describe('buildTimeRangeQuery', () => {
  test('builds a calendar-query request', () => {
    const xml = buildTimeRangeQuery('2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z');

    expect(xml).toContain('<c:calendar-query');
    expect(xml).toContain('</c:calendar-query>');
  });

  test('requests calendar-data in response', () => {
    const xml = buildTimeRangeQuery('2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z');

    expect(xml).toContain('<c:calendar-data/>');
  });

  test('requests getetag in response', () => {
    const xml = buildTimeRangeQuery('2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z');

    expect(xml).toContain('<d:getetag/>');
  });

  test('filters for VEVENT components', () => {
    const xml = buildTimeRangeQuery('2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z');

    expect(xml).toContain('<c:comp-filter name="VCALENDAR">');
    expect(xml).toContain('<c:comp-filter name="VEVENT">');
  });

  test('converts ISO dates to CalDAV format', () => {
    const xml = buildTimeRangeQuery('2024-01-15T10:30:00Z', '2024-02-20T14:45:00Z');

    // CalDAV format: YYYYMMDDTHHmmssZ
    expect(xml).toContain('start="20240115T103000Z"');
    expect(xml).toContain('end="20240220T144500Z"');
  });

  test('handles dates at midnight', () => {
    const xml = buildTimeRangeQuery('2024-01-01T00:00:00Z', '2024-12-31T00:00:00Z');

    expect(xml).toContain('start="20240101T000000Z"');
    expect(xml).toContain('end="20241231T000000Z"');
  });

  test('handles end of day times', () => {
    const xml = buildTimeRangeQuery('2024-06-15T00:00:00Z', '2024-06-15T23:59:59Z');

    expect(xml).toContain('start="20240615T000000Z"');
    expect(xml).toContain('end="20240615T235959Z"');
  });
});
