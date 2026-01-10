// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * MCP Server Durable Object
 * Handles SSE connections and dispatches tool calls
 */

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

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // TODO: Implement MCP protocol handling
    // - SSE connection setup
    // - Tool call dispatch
    // - Response streaming

    return new Response('MCP Server - Not yet implemented', { status: 501 });
  }
}
