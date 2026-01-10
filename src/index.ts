/**
 * Cloudflare Worker entry point
 * Routes requests to the MCP Server Durable Object
 */

import { McpServer } from './mcp-server';

import type { Env } from './types';

export { McpServer };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Get or create a Durable Object instance
    // Using a fixed ID for now; could be per-user in the future
    const id = env.MCP_SERVER.idFromName('default');
    const stub = env.MCP_SERVER.get(id);

    // Forward the request to the Durable Object
    return stub.fetch(request);
  },
};
