// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * MCP Server Durable Object
 * Handles SSE connections and dispatches tool calls
 */

import { getCredentials } from './auth/credentials';
import { CalDAVClient } from './caldav/client';
import { buildCalendarDiscovery } from './caldav/xml-builder';
import type { Env } from './types';

export class McpServer implements DurableObject {
  private readonly env: Env;

  constructor(_state: DurableObjectState, env: Env) {
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // Test auth endpoint - verifies credentials work with iCloud CalDAV
    if (url.pathname === '/test-auth') {
      return this.testAuth();
    }

    // TODO: Implement MCP protocol handling
    // - SSE connection setup
    // - Tool call dispatch
    // - Response streaming

    return new Response('MCP Server - Not yet implemented', { status: 501 });
  }

  /**
   * Test authentication by making a simple CalDAV request
   * Returns success/failure without exposing credentials
   */
  private async testAuth(): Promise<Response> {
    try {
      const credentials = getCredentials(this.env);
      const client = new CalDAVClient(credentials);

      // Make a simple PROPFIND to the principal URL
      const xml = buildCalendarDiscovery();
      const response = await client.propfind('/', [xml]);

      // If we get here without throwing, auth worked
      return Response.json({
        success: true,
        message: 'Authentication successful - connected to iCloud CalDAV',
        responseLength: response.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Check for common auth failures
      if (message.includes('401')) {
        return Response.json(
          {
            success: false,
            error: 'Authentication failed - check your Apple ID and app-specific password',
          },
          { status: 401 }
        );
      }

      if (message.includes('secret not set')) {
        return Response.json(
          {
            success: false,
            error: message,
            hint: 'Run: bunx wrangler secret put APPLE_ID && bunx wrangler secret put APP_PASSWORD',
          },
          { status: 500 }
        );
      }

      return Response.json(
        {
          success: false,
          error: message,
        },
        { status: 500 }
      );
    }
  }
}
