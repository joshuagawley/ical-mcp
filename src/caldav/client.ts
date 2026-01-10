/**
 * CalDAV HTTP client
 * Handles all communication with the iCloud CalDAV server
 */

import type { Credentials } from '../auth/credentials';

const CALDAV_BASE_URL = 'https://caldav.icloud.com';

export class CalDAVClient {
  private readonly baseUrl: string;
  private readonly credentials: Credentials;

  constructor(credentials: Credentials, baseUrl: string = CALDAV_BASE_URL) {
    this.baseUrl = baseUrl;
    this.credentials = credentials;
  }

  /**
   * PROPFIND - Discover calendars and their properties
   */
  async propfind(path: string, props: string[]): Promise<string> {
    // TODO: Implement PROPFIND request
    void props; // Suppress unused warning until implemented
    return this.request('PROPFIND', path, '');
  }

  /**
   * REPORT - Query events by time range or other criteria
   */
  async report(path: string, query: string): Promise<string> {
    return this.request('REPORT', path, query);
  }

  /**
   * GET - Fetch a single .ics file
   */
  async get(path: string): Promise<string> {
    return this.request('GET', path);
  }

  /**
   * PUT - Create or update an event
   */
  async put(path: string, icalData: string): Promise<string> {
    return this.request('PUT', path, icalData);
  }

  /**
   * DELETE - Remove an event
   */
  async delete(path: string): Promise<string> {
    return this.request('DELETE', path);
  }

  /**
   * Make an authenticated request to the CalDAV server
   */
  private async request(method: string, path: string, body?: string): Promise<string> {
    const url = `${this.baseUrl}${path}`;
    const auth = btoa(`${this.credentials.appleId}:${this.credentials.appSpecificPassword}`);

    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/xml; charset=utf-8',
    };

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      // TODO: Convert to structured error
      throw new Error(`CalDAV request failed: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }
}
