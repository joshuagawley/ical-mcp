// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * MCP Server HTTP Handler
 * Implements Streamable HTTP transport for MCP protocol
 */

import { getCredentials } from '../auth/credentials';
import { CalDAVClient } from '../caldav/client';

import { createJsonRpcError, parseJsonRpcMessage, routeRequest } from './protocol';

import type { Env } from '../types';

export const MCP_ENDPOINT = '/mcp';

/**
 * Handle incoming MCP HTTP requests
 * Implements Streamable HTTP transport per MCP specification
 */
export async function handleMcpRequest(request: Request, env: Env): Promise<Response> {
  const method = request.method;

  // Handle GET requests - for server-initiated SSE streams
  if (method === 'GET') {
    // We're not implementing server-initiated streams yet
    return new Response('SSE streams not supported', { status: 405 });
  }

  // Only POST is supported for sending messages
  if (method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Validate Accept header per MCP spec
  const accept = request.headers.get('Accept') ?? '';
  if (!accept.includes('application/json')) {
    return new Response('Accept header must include application/json', { status: 400 });
  }

  // Parse the request body
  const bodyText = await request.text();
  const parseResult = parseJsonRpcMessage(bodyText);

  if (!parseResult.success) {
    return Response.json(
      createJsonRpcError(null, parseResult.error.code, parseResult.error.message),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const jsonRpcRequest = parseResult.data;

  // Check if this is a notification (no id = no response expected)
  const isNotification = jsonRpcRequest.id === undefined;

  // Create CalDAV client for tool calls
  let client: CalDAVClient | null = null;
  try {
    const credentials = getCredentials(env);
    client = new CalDAVClient(credentials);
  } catch {
    // If credentials aren't configured, we can still handle non-tool requests
    // tools/call will fail with an appropriate error
  }

  // Route the request to the appropriate handler
  const response = await routeRequest(jsonRpcRequest, client);

  // For notifications, return 202 Accepted with no body
  if (isNotification) {
    return new Response(null, { status: 202 });
  }

  // Return the JSON-RPC response
  return Response.json(response, {
    headers: { 'Content-Type': 'application/json' },
  });
}
