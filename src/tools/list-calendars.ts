// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * list_calendars tool
 * Discovers and returns all calendars available in the user's iCloud account
 */

import { buildCalendarList } from '../caldav/xml-builder';
import { parseCalendarList } from '../caldav/xml-parser';

import type { CalDAVClient } from '../caldav/client';
import type { ToolResult, Calendar } from '../types';
import type { ToolHandler } from './index';

// No parameters needed for listing calendars
type ListCalendarsParams = Record<string, never>;

export const listCalendars: ToolHandler<ListCalendarsParams, Calendar[]> = {
  name: 'list_calendars',
  description: 'List all calendars available in the connected iCloud account',
  schema: {
    type: 'object',
    properties: {},
    required: [],
  },

  async execute(
    _params: ListCalendarsParams,
    client: CalDAVClient
  ): Promise<ToolResult<Calendar[]>> {
    try {
      // Build the PROPFIND request to list calendars
      const requestXml = buildCalendarList();

      // Make the request to the calendar home
      // iCloud uses a two-step discovery: first get calendar-home-set, then list calendars
      // For simplicity, we'll query the root and filter for calendar resources
      const responseXml = await client.propfind('/', [requestXml]);

      // Parse the response to extract calendar list
      const calendars = parseCalendarList(responseXml);

      return {
        success: true,
        data: calendars,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Check for auth failure
      if (message.includes('401')) {
        return {
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Authentication failed - check your credentials',
          },
        };
      }

      // General CalDAV error
      return {
        success: false,
        error: {
          code: 'CALDAV_ERROR',
          message: `Failed to list calendars: ${message}`,
        },
      };
    }
  },
};
