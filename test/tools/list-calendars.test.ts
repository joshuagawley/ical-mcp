// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for list_calendars tool
 */

import { describe, expect, it } from 'bun:test';

import { listCalendars } from '../../src/tools/list-calendars';

import type { CalDAVClient } from '../../src/caldav/client';
import type { ToolResult, Calendar } from '../../src/types';

// Mock CalDAV client factory
function createMockClient(propfindResponse: string): CalDAVClient {
  return {
    propfind: async () => propfindResponse,
    report: async () => '',
    get: async () => '',
    put: async () => '',
    delete: async () => '',
  } as unknown as CalDAVClient;
}

// Sample CalDAV responses
const SAMPLE_CALENDAR_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:x="http://apple.com/ns/ical/">
  <d:response>
    <d:href>/calendars/user123/calendar1/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Work</d:displayname>
        <d:resourcetype>
          <d:collection/>
          <c:calendar/>
        </d:resourcetype>
        <x:calendar-color>#FF0000</x:calendar-color>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
  <d:response>
    <d:href>/calendars/user123/calendar2/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Personal</d:displayname>
        <d:resourcetype>
          <d:collection/>
          <c:calendar/>
        </d:resourcetype>
        <x:calendar-color>#00FF00</x:calendar-color>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;

const EMPTY_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
</d:multistatus>`;

const MIXED_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:x="http://apple.com/ns/ical/">
  <d:response>
    <d:href>/calendars/user123/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Calendars</d:displayname>
        <d:resourcetype>
          <d:collection/>
        </d:resourcetype>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
  <d:response>
    <d:href>/calendars/user123/calendar1/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>My Calendar</d:displayname>
        <d:resourcetype>
          <d:collection/>
          <c:calendar/>
        </d:resourcetype>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;

const CALENDAR_WITHOUT_COLOR = `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/calendars/user123/default/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Default Calendar</d:displayname>
        <d:resourcetype>
          <d:collection/>
          <c:calendar/>
        </d:resourcetype>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;

describe('list_calendars tool', () => {
  describe('schema', () => {
    it('has correct tool name', () => {
      expect(listCalendars.name).toBe('list_calendars');
    });

    it('has a description', () => {
      expect(listCalendars.description).toBeTruthy();
      expect(typeof listCalendars.description).toBe('string');
    });

    it('has a schema with no required parameters', () => {
      expect(listCalendars.schema).toEqual({
        type: 'object',
        properties: {},
        required: [],
      });
    });
  });

  describe('execute', () => {
    it('returns calendars on success', async () => {
      const client = createMockClient(SAMPLE_CALENDAR_RESPONSE);
      const result = (await listCalendars.execute({}, client)) as ToolResult<Calendar[]>;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toEqual({
          href: '/calendars/user123/calendar1/',
          displayName: 'Work',
          color: '#FF0000',
        });
        expect(result.data[1]).toEqual({
          href: '/calendars/user123/calendar2/',
          displayName: 'Personal',
          color: '#00FF00',
        });
      }
    });

    it('returns empty array when no calendars exist', async () => {
      const client = createMockClient(EMPTY_RESPONSE);
      const result = (await listCalendars.execute({}, client)) as ToolResult<Calendar[]>;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('filters out non-calendar collections', async () => {
      const client = createMockClient(MIXED_RESPONSE);
      const result = (await listCalendars.execute({}, client)) as ToolResult<Calendar[]>;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]?.displayName).toBe('My Calendar');
      }
    });

    it('handles calendars without color', async () => {
      const client = createMockClient(CALENDAR_WITHOUT_COLOR);
      const result = (await listCalendars.execute({}, client)) as ToolResult<Calendar[]>;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual({
          href: '/calendars/user123/default/',
          displayName: 'Default Calendar',
        });
        expect(result.data[0]?.color).toBeUndefined();
      }
    });

    it('returns CALDAV_ERROR when client throws', async () => {
      const client = {
        propfind: async () => {
          throw new Error('CalDAV request failed: 500 Internal Server Error');
        },
      } as unknown as CalDAVClient;

      const result = await listCalendars.execute({}, client);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CALDAV_ERROR');
        expect(result.error.message).toContain('500');
      }
    });

    it('returns AUTH_FAILED when client returns 401', async () => {
      const client = {
        propfind: async () => {
          throw new Error('CalDAV request failed: 401 Unauthorized');
        },
      } as unknown as CalDAVClient;

      const result = await listCalendars.execute({}, client);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTH_FAILED');
      }
    });
  });
});
