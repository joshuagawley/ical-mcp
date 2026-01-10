// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for CalDAV XML parser
 */

import { describe, expect, test } from 'bun:test';

import { parseCalendarList, parseCalendarData } from '../../src/caldav/xml-parser';

describe('parseCalendarList', () => {
  test('parses a single calendar from multistatus response', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:x="http://apple.com/ns/ical/">
  <d:response>
    <d:href>/calendars/user/calendar-1/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Work Calendar</d:displayname>
        <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
        <x:calendar-color>#FF0000</x:calendar-color>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;

    const calendars = parseCalendarList(xml);

    expect(calendars).toHaveLength(1);
    expect(calendars[0]?.href).toBe('/calendars/user/calendar-1/');
    expect(calendars[0]?.displayName).toBe('Work Calendar');
    expect(calendars[0]?.color).toBe('#FF0000');
  });

  test('parses multiple calendars', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:x="http://apple.com/ns/ical/">
  <d:response>
    <d:href>/calendars/user/work/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Work</d:displayname>
        <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
        <x:calendar-color>#0000FF</x:calendar-color>
      </d:prop>
    </d:propstat>
  </d:response>
  <d:response>
    <d:href>/calendars/user/personal/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Personal</d:displayname>
        <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
        <x:calendar-color>#00FF00</x:calendar-color>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`;

    const calendars = parseCalendarList(xml);

    expect(calendars).toHaveLength(2);
    expect(calendars[0]?.displayName).toBe('Work');
    expect(calendars[1]?.displayName).toBe('Personal');
  });

  test('handles calendar without color', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/calendars/user/no-color/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>No Color Calendar</d:displayname>
        <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`;

    const calendars = parseCalendarList(xml);

    expect(calendars).toHaveLength(1);
    expect(calendars[0]?.displayName).toBe('No Color Calendar');
    expect(calendars[0]?.color).toBeUndefined();
  });

  test('skips non-calendar resources', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/calendars/user/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>User Home</d:displayname>
        <d:resourcetype><d:collection/></d:resourcetype>
      </d:prop>
    </d:propstat>
  </d:response>
  <d:response>
    <d:href>/calendars/user/actual-calendar/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>My Calendar</d:displayname>
        <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`;

    const calendars = parseCalendarList(xml);

    expect(calendars).toHaveLength(1);
    expect(calendars[0]?.displayName).toBe('My Calendar');
  });

  test('returns empty array for empty response', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:">
</d:multistatus>`;

    const calendars = parseCalendarList(xml);

    expect(calendars).toHaveLength(0);
  });

  test('returns empty array for invalid XML', () => {
    const calendars = parseCalendarList('not xml');

    expect(calendars).toHaveLength(0);
  });
});

describe('parseCalendarData', () => {
  test('extracts single event iCal data', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/calendars/user/cal/event1.ics</d:href>
    <d:propstat>
      <d:prop>
        <d:getetag>"abc123"</d:getetag>
        <c:calendar-data>BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-1@example.com
SUMMARY:Test Event
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
END:VEVENT
END:VCALENDAR</c:calendar-data>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`;

    const icalData = parseCalendarData(xml);

    expect(icalData).toHaveLength(1);
    expect(icalData[0]).toContain('BEGIN:VCALENDAR');
    expect(icalData[0]).toContain('UID:event-1@example.com');
    expect(icalData[0]).toContain('SUMMARY:Test Event');
  });

  test('extracts multiple events', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/cal/event1.ics</d:href>
    <d:propstat>
      <d:prop>
        <c:calendar-data>BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-1
SUMMARY:Event One
END:VEVENT
END:VCALENDAR</c:calendar-data>
      </d:prop>
    </d:propstat>
  </d:response>
  <d:response>
    <d:href>/cal/event2.ics</d:href>
    <d:propstat>
      <d:prop>
        <c:calendar-data>BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-2
SUMMARY:Event Two
END:VEVENT
END:VCALENDAR</c:calendar-data>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`;

    const icalData = parseCalendarData(xml);

    expect(icalData).toHaveLength(2);
    expect(icalData[0]).toContain('UID:event-1');
    expect(icalData[1]).toContain('UID:event-2');
  });

  test('unescapes XML entities in calendar data', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:propstat>
      <d:prop>
        <c:calendar-data>BEGIN:VEVENT
SUMMARY:Meeting &amp; Discussion
DESCRIPTION:Use &lt;code&gt; tags
END:VEVENT</c:calendar-data>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`;

    const icalData = parseCalendarData(xml);

    expect(icalData).toHaveLength(1);
    expect(icalData[0]).toContain('SUMMARY:Meeting & Discussion');
    expect(icalData[0]).toContain('DESCRIPTION:Use <code> tags');
  });

  test('returns empty array when no calendar-data elements', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/calendars/user/</d:href>
  </d:response>
</d:multistatus>`;

    const icalData = parseCalendarData(xml);

    expect(icalData).toHaveLength(0);
  });

  test('handles calendar-data with attributes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:propstat>
      <d:prop>
        <c:calendar-data content-type="text/calendar">BEGIN:VEVENT
UID:with-attrs
END:VEVENT</c:calendar-data>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`;

    const icalData = parseCalendarData(xml);

    expect(icalData).toHaveLength(1);
    expect(icalData[0]).toContain('UID:with-attrs');
  });
});
