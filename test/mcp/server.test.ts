// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for MCP Server HTTP handling
 * Tests Streamable HTTP transport endpoints
 */

import { describe, expect, it } from 'bun:test';

import { handleMcpRequest, MCP_ENDPOINT } from '../../src/mcp/server';

import type { Env } from '../../src/types';

// Response body types for tests
interface JsonRpcResponseBody {
  jsonrpc: string;
  id: number | string | null;
  result?: {
    protocolVersion?: string;
    serverInfo?: { name: string };
    tools?: unknown[];
    content?: unknown[];
  };
  error?: {
    code: number;
    message: string;
  };
}

// Mock environment
function createMockEnv(): Env {
  return {
    MCP_SERVER: {} as Env['MCP_SERVER'],
    APPLE_ID: 'test@example.com',
    APP_PASSWORD: 'test-password',
  };
}

describe('MCP Server HTTP Handler', () => {
  describe('endpoint configuration', () => {
    it('exposes MCP endpoint path', () => {
      expect(MCP_ENDPOINT).toBe('/mcp');
    });
  });

  describe('POST /mcp', () => {
    it('handles initialize request', async () => {
      const request = new Request('https://example.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'TestClient', version: '1.0.0' },
          },
        }),
      });

      const response = await handleMcpRequest(request, createMockEnv());

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = (await response.json()) as JsonRpcResponseBody;
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe(1);
      expect(body.result?.protocolVersion).toBeDefined();
      expect(body.result?.serverInfo?.name).toBe('ical-mcp');
    });

    it('handles tools/list request', async () => {
      const request = new Request('https://example.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        }),
      });

      const response = await handleMcpRequest(request, createMockEnv());

      expect(response.status).toBe(200);

      const body = (await response.json()) as JsonRpcResponseBody;
      expect(body.result?.tools).toBeInstanceOf(Array);
      expect(body.result?.tools?.length).toBeGreaterThan(0);
    });

    it('handles tools/call request for list_calendars', async () => {
      // Note: This will fail in tests because we don't have a real CalDAV server
      // but it should return a proper error response structure
      const request = new Request('https://example.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'list_calendars',
            arguments: {},
          },
        }),
      });

      const response = await handleMcpRequest(request, createMockEnv());

      expect(response.status).toBe(200);

      const body = (await response.json()) as JsonRpcResponseBody;
      expect(body.jsonrpc).toBe('2.0');
      expect(body.id).toBe(3);
      // Should have result with content array (may be error due to no real CalDAV)
      expect(body.result?.content).toBeInstanceOf(Array);
    });

    it('returns error for unknown method', async () => {
      const request = new Request('https://example.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'unknown/method',
        }),
      });

      const response = await handleMcpRequest(request, createMockEnv());

      expect(response.status).toBe(200);

      const body = (await response.json()) as JsonRpcResponseBody;
      expect(body.error).toBeDefined();
      expect(body.error?.code).toBe(-32601); // Method not found
    });

    it('returns parse error for invalid JSON', async () => {
      const request = new Request('https://example.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: 'not valid json',
      });

      const response = await handleMcpRequest(request, createMockEnv());

      expect(response.status).toBe(200);

      const body = (await response.json()) as JsonRpcResponseBody;
      expect(body.error).toBeDefined();
      expect(body.error?.code).toBe(-32700); // Parse error
    });

    it('returns 202 Accepted for notifications', async () => {
      const request = new Request('https://example.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
      });

      const response = await handleMcpRequest(request, createMockEnv());

      // Notifications should return 202 Accepted with no body
      expect(response.status).toBe(202);
    });
  });

  describe('HEAD /mcp', () => {
    it('returns protocol version header', async () => {
      const request = new Request('https://example.com/mcp', {
        method: 'HEAD',
      });

      const response = await handleMcpRequest(request, createMockEnv());

      expect(response.status).toBe(200);
      expect(response.headers.get('MCP-Protocol-Version')).toBe('2024-11-05');
    });
  });

  describe('GET /mcp', () => {
    it('returns 405 Method Not Allowed (SSE not supported yet)', async () => {
      const request = new Request('https://example.com/mcp', {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
        },
      });

      const response = await handleMcpRequest(request, createMockEnv());

      // We're not implementing server-initiated SSE streams yet
      expect(response.status).toBe(405);
    });
  });

  describe('request validation', () => {
    it('requires Accept header with application/json', async () => {
      const request = new Request('https://example.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Missing Accept header
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {},
        }),
      });

      const response = await handleMcpRequest(request, createMockEnv());

      expect(response.status).toBe(400);
    });
  });
});
