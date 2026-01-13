// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * MCP Server Durable Object
 * Handles Streamable HTTP transport for MCP protocol with OAuth authentication
 */

import { getCredentials } from './auth/credentials';
import { CalDAVClient } from './caldav/client';
import { buildCalendarDiscovery } from './caldav/xml-builder';
import { handleMcpRequest, MCP_ENDPOINT } from './mcp/server';
import {
  handleDiscovery,
  handleRegister,
  handleAuthorize,
  handleAuthorizeSubmit,
  handleToken,
} from './oauth';

import type { Env } from './types';

export class McpServer implements DurableObject {
  private readonly state: DurableObjectState;
  private readonly env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // Test auth endpoint - verifies credentials work with iCloud CalDAV
    if (url.pathname === '/test-auth') {
      return this.testAuth();
    }

    // =========================================================================
    // OAuth Endpoints
    // =========================================================================

    // OAuth Discovery - GET /.well-known/oauth-authorization-server
    if (url.pathname === '/.well-known/oauth-authorization-server' && method === 'GET') {
      return handleDiscovery(request);
    }

    // Dynamic Client Registration - POST /oauth/register
    if (url.pathname === '/oauth/register' && method === 'POST') {
      return handleRegister(request, this.state);
    }

    // Authorization - GET /oauth/authorize (show form)
    if (url.pathname === '/oauth/authorize' && method === 'GET') {
      return handleAuthorize(request, this.state);
    }

    // Authorization - POST /oauth/authorize (submit credentials)
    if (url.pathname === '/oauth/authorize' && method === 'POST') {
      return handleAuthorizeSubmit(request, this.state);
    }

    // Token - POST /oauth/token
    if (url.pathname === '/oauth/token' && method === 'POST') {
      return handleToken(request, this.state);
    }

    // =========================================================================
    // MCP Protocol Endpoint
    // =========================================================================

    // MCP protocol endpoint - Streamable HTTP transport
    if (url.pathname === MCP_ENDPOINT) {
      // TODO: Add OAuth token validation here when implemented
      // For now, fall back to legacy single-user credentials
      return handleMcpRequest(request, this.env);
    }

    return new Response('Not found', { status: 404 });
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
