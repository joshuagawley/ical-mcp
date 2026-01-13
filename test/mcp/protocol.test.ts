// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tests for MCP protocol handling
 * Tests JSON-RPC message parsing, routing, and response formatting
 */

import { describe, expect, it } from 'bun:test';

import {
  parseJsonRpcMessage,
  createJsonRpcResponse,
  createJsonRpcError,
  handleInitialize,
  handleToolsList,
  handleToolsCall,
  MCP_PROTOCOL_VERSION,
  SERVER_INFO,
} from '../../src/mcp/protocol';

import type { JsonRpcRequest } from '../../src/mcp/types';

describe('MCP Protocol', () => {
  describe('parseJsonRpcMessage', () => {
    it('parses valid JSON-RPC request', () => {
      const json = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });

      const result = parseJsonRpcMessage(json);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jsonrpc).toBe('2.0');
        expect(result.data.id).toBe(1);
        expect(result.data.method).toBe('initialize');
      }
    });

    it('parses request with string id', () => {
      const json = JSON.stringify({
        jsonrpc: '2.0',
        id: 'abc-123',
        method: 'tools/list',
      });

      const result = parseJsonRpcMessage(json);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('abc-123');
      }
    });

    it('parses notification (no id)', () => {
      const json = JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      });

      const result = parseJsonRpcMessage(json);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBeUndefined();
      }
    });

    it('rejects invalid JSON', () => {
      const result = parseJsonRpcMessage('not valid json');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(-32700);
        expect(result.error.message).toContain('Parse error');
      }
    });

    it('rejects missing jsonrpc version', () => {
      const json = JSON.stringify({
        id: 1,
        method: 'test',
      });

      const result = parseJsonRpcMessage(json);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(-32600);
        expect(result.error.message).toContain('Invalid Request');
      }
    });

    it('rejects wrong jsonrpc version', () => {
      const json = JSON.stringify({
        jsonrpc: '1.0',
        id: 1,
        method: 'test',
      });

      const result = parseJsonRpcMessage(json);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(-32600);
      }
    });

    it('rejects missing method', () => {
      const json = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
      });

      const result = parseJsonRpcMessage(json);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(-32600);
      }
    });
  });

  describe('createJsonRpcResponse', () => {
    it('creates valid response with result', () => {
      const response = createJsonRpcResponse(1, { foo: 'bar' });

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toEqual({ foo: 'bar' });
      expect(response).not.toHaveProperty('error');
    });

    it('creates response with string id', () => {
      const response = createJsonRpcResponse('abc', { data: 123 });

      expect(response.id).toBe('abc');
    });
  });

  describe('createJsonRpcError', () => {
    it('creates valid error response', () => {
      const response = createJsonRpcError(1, -32601, 'Method not found');

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toBe('Method not found');
      expect(response).not.toHaveProperty('result');
    });

    it('includes optional data in error', () => {
      const response = createJsonRpcError(1, -32602, 'Invalid params', {
        param: 'foo',
      });

      expect(response.error.data).toEqual({ param: 'foo' });
    });

    it('handles null id for parse errors', () => {
      const response = createJsonRpcError(null, -32700, 'Parse error');

      expect(response.id).toBeNull();
    });
  });

  describe('handleInitialize', () => {
    it('returns server capabilities and info', () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'TestClient', version: '1.0.0' },
        },
      };

      const response = handleInitialize(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result.protocolVersion).toBe(MCP_PROTOCOL_VERSION);
      expect(response.result.serverInfo).toEqual(SERVER_INFO);
      expect(response.result.capabilities).toHaveProperty('tools');
    });

    it('advertises tools capability', () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'TestClient', version: '1.0.0' },
        },
      };

      const response = handleInitialize(request);

      expect(response.result.capabilities.tools).toBeDefined();
    });
  });

  describe('handleToolsList', () => {
    it('returns available tools', () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      };

      const response = handleToolsList(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(2);
      expect(Array.isArray(response.result.tools)).toBe(true);
    });

    it('includes list_calendars tool', () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      };

      const response = handleToolsList(request);
      const toolsList = response.result.tools;

      const listCalendarsTool = toolsList.find(
        (t: { name: string }) => t.name === 'list_calendars'
      );
      expect(listCalendarsTool).toBeDefined();
      if (listCalendarsTool) {
        expect(listCalendarsTool.description).toBeTruthy();
        expect(listCalendarsTool.inputSchema).toBeDefined();
      }
    });
  });

  describe('handleToolsCall', () => {
    it('returns error for unknown tool', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      };

      // Mock client - not used for unknown tool
      const mockClient = {} as unknown as Parameters<typeof handleToolsCall>[1];

      const response = await handleToolsCall(request, mockClient);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(3);
      expect(response.result.isError).toBe(true);
      const firstContent = response.result.content[0];
      expect(firstContent).toBeDefined();
      if (firstContent) {
        expect(firstContent.text).toContain('Unknown tool');
      }
    });

    it('returns error when tool name is missing', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          arguments: {},
        },
      };

      const mockClient = {} as unknown as Parameters<typeof handleToolsCall>[1];
      const response = await handleToolsCall(request, mockClient);

      expect(response.result.isError).toBe(true);
      const firstContent = response.result.content[0];
      expect(firstContent).toBeDefined();
      if (firstContent) {
        expect(firstContent.text).toContain('Missing tool name');
      }
    });

    it('calls list_calendars tool successfully', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'list_calendars',
          arguments: {},
        },
      };

      // Mock CalDAV client returning sample calendars
      const mockClient = {
        propfind: async () => `<?xml version="1.0"?>
          <d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
            <d:response>
              <d:href>/calendars/test/</d:href>
              <d:propstat>
                <d:prop>
                  <d:displayname>Test Calendar</d:displayname>
                  <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
                </d:prop>
              </d:propstat>
            </d:response>
          </d:multistatus>`,
      } as unknown as Parameters<typeof handleToolsCall>[1];

      const response = await handleToolsCall(request, mockClient);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(3);
      expect(response.result.isError).toBeFalsy();
      const firstContent = response.result.content[0];
      expect(firstContent).toBeDefined();
      if (firstContent) {
        expect(firstContent.type).toBe('text');
        // Response should contain the calendar data as JSON
        expect(firstContent.text).toContain('Test Calendar');
      }
    });

    it('handles tool execution error gracefully', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'list_calendars',
          arguments: {},
        },
      };

      // Mock client that throws
      const mockClient = {
        propfind: async () => {
          throw new Error('Network error');
        },
      } as unknown as Parameters<typeof handleToolsCall>[1];

      const response = await handleToolsCall(request, mockClient);

      expect(response.result.isError).toBe(true);
      const firstContent = response.result.content[0];
      expect(firstContent).toBeDefined();
      if (firstContent) {
        expect(firstContent.text).toContain('error');
      }
    });
  });
});
