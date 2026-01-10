// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * XML parser for CalDAV responses
 * Extracts calendar data from WebDAV/CalDAV XML responses
 */

import type { Calendar } from '../types';

/**
 * Parse a multistatus response to extract calendar list
 * Note: Using regex for simple parsing; consider a proper XML parser for production
 */
export function parseCalendarList(xml: string): Calendar[] {
  const calendars: Calendar[] = [];

  // Match each response element
  const responseRegex = /<d:response>([\s\S]*?)<\/d:response>/gi;
  let match;

  while ((match = responseRegex.exec(xml)) !== null) {
    const responseXml = match[1];
    if (responseXml === undefined) continue;

    // Check if this is a calendar resource
    if (!responseXml.includes('<d:resourcetype>') || !responseXml.includes('calendar')) {
      continue;
    }

    const href = extractTag(responseXml, 'd:href');
    const displayName = extractTag(responseXml, 'd:displayname');
    const color = extractTag(responseXml, 'x:calendar-color');

    if (href && displayName) {
      const calendar: Calendar = {
        href,
        displayName,
      };
      if (color) {
        calendars.push({ ...calendar, color });
      } else {
        calendars.push(calendar);
      }
    }
  }

  return calendars;
}

/**
 * Parse a multistatus response to extract calendar-data (iCal) content
 */
export function parseCalendarData(xml: string): string[] {
  const icalData: string[] = [];

  const calendarDataRegex = /<c:calendar-data[^>]*>([\s\S]*?)<\/c:calendar-data>/gi;
  let match;

  while ((match = calendarDataRegex.exec(xml)) !== null) {
    const data = match[1];
    if (data) {
      // Unescape XML entities
      icalData.push(unescapeXml(data.trim()));
    }
  }

  return icalData;
}

/**
 * Extract text content from an XML tag
 */
function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
  const match = regex.exec(xml);
  return match?.[1]?.trim() ?? null;
}

/**
 * Unescape common XML entities
 */
function unescapeXml(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
