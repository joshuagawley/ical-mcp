// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * MCP Protocol Handler
 * Implements JSON-RPC 2.0 message parsing and MCP method handlers
 */

import { tools } from '../tools/index';

import { JSON_RPC_ERRORS } from './types';

import type {
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
  McpInitializeResult,
  McpTool,
  McpToolsCallParams,
  McpToolsCallResult,
  McpToolsListResult,
  ParseResult,
} from './types';
import type { CalDAVClient } from '../caldav/client';

// Server constants
export const MCP_PROTOCOL_VERSION = '2024-11-05';
export const SERVER_INFO = {
  name: 'ical-mcp',
  version: '1.0.0',
} as const;

/**
 * Parse a JSON-RPC message from a string
 */
export function parseJsonRpcMessage(json: string): ParseResult<JsonRpcRequest> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      success: false,
      error: {
        code: JSON_RPC_ERRORS.PARSE_ERROR,
        message: 'Parse error: Invalid JSON',
      },
    };
  }

  // Validate basic structure
  if (typeof parsed !== 'object' || parsed === null) {
    return {
      success: false,
      error: {
        code: JSON_RPC_ERRORS.INVALID_REQUEST,
        message: 'Invalid Request: Expected object',
      },
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Validate jsonrpc version
  if (obj['jsonrpc'] !== '2.0') {
    return {
      success: false,
      error: {
        code: JSON_RPC_ERRORS.INVALID_REQUEST,
        message: 'Invalid Request: jsonrpc must be "2.0"',
      },
    };
  }

  // Validate method
  if (typeof obj['method'] !== 'string') {
    return {
      success: false,
      error: {
        code: JSON_RPC_ERRORS.INVALID_REQUEST,
        message: 'Invalid Request: method must be a string',
      },
    };
  }

  // Validate id (optional for notifications)
  const id = obj['id'];
  if (id !== undefined && typeof id !== 'string' && typeof id !== 'number') {
    return {
      success: false,
      error: {
        code: JSON_RPC_ERRORS.INVALID_REQUEST,
        message: 'Invalid Request: id must be string or number',
      },
    };
  }

  return {
    success: true,
    data: {
      jsonrpc: '2.0',
      id: id as string | number | undefined,
      method: obj['method'] as string,
      params: obj['params'] as Record<string, unknown> | undefined,
    },
  };
}

/**
 * Create a JSON-RPC success response
 */
export function createJsonRpcResponse(
  id: string | number | null,
  result: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * Create a JSON-RPC error response
 */
export function createJsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcError {
  const error: JsonRpcError['error'] = { code, message };
  if (data !== undefined) {
    return {
      jsonrpc: '2.0',
      id,
      error: { ...error, data },
    };
  }
  return {
    jsonrpc: '2.0',
    id,
    error,
  };
}

/**
 * Handle initialize request
 */
export function handleInitialize(
  request: JsonRpcRequest
): JsonRpcResponse & { result: McpInitializeResult } {
  // We don't use client params yet, but could for capability negotiation
  void request.params;

  return createJsonRpcResponse(request.id ?? null, {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {
      tools: {},
    },
    serverInfo: SERVER_INFO,
  }) as JsonRpcResponse & { result: McpInitializeResult };
}

/**
 * Handle tools/list request
 */
export function handleToolsList(
  request: JsonRpcRequest
): JsonRpcResponse & { result: McpToolsListResult } {
  const toolList: McpTool[] = [];

  for (const [, handler] of tools) {
    toolList.push({
      name: handler.name,
      description: handler.description,
      inputSchema: handler.schema,
    });
  }

  return createJsonRpcResponse(request.id ?? null, {
    tools: toolList,
  }) as JsonRpcResponse & { result: McpToolsListResult };
}

/**
 * Handle tools/call request
 */
export async function handleToolsCall(
  request: JsonRpcRequest,
  client: CalDAVClient
): Promise<JsonRpcResponse & { result: McpToolsCallResult }> {
  const params = request.params as McpToolsCallParams | undefined;

  // Validate tool name
  if (!params?.name) {
    return createJsonRpcResponse(request.id ?? null, {
      content: [{ type: 'text', text: 'Error: Missing tool name' }],
      isError: true,
    }) as JsonRpcResponse & { result: McpToolsCallResult };
  }

  const toolName = params.name;
  const toolArgs = params.arguments ?? {};

  // Find the tool handler
  const handler = tools.get(toolName);
  if (!handler) {
    return createJsonRpcResponse(request.id ?? null, {
      content: [
        {
          type: 'text',
          text: `Error: Unknown tool "${toolName}". Available tools: ${Array.from(tools.keys()).join(', ')}`,
        },
      ],
      isError: true,
    }) as JsonRpcResponse & { result: McpToolsCallResult };
  }

  // Execute the tool
  const result = await handler.execute(toolArgs, client);

  if (result.success) {
    return createJsonRpcResponse(request.id ?? null, {
      content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
    }) as JsonRpcResponse & { result: McpToolsCallResult };
  } else {
    return createJsonRpcResponse(request.id ?? null, {
      content: [
        {
          type: 'text',
          text: `Error: ${result.error.message}${result.error.details ? `\nDetails: ${JSON.stringify(result.error.details)}` : ''}`,
        },
      ],
      isError: true,
    }) as JsonRpcResponse & { result: McpToolsCallResult };
  }
}

/**
 * Route a JSON-RPC request to the appropriate handler
 */
export async function routeRequest(
  request: JsonRpcRequest,
  client: CalDAVClient | null
): Promise<JsonRpcResponse | JsonRpcError> {
  switch (request.method) {
    case 'initialize':
      return handleInitialize(request);

    case 'notifications/initialized':
      // This is a notification, no response needed
      // Return a minimal response to indicate success
      return createJsonRpcResponse(request.id ?? null, {});

    case 'tools/list':
      return handleToolsList(request);

    case 'tools/call':
      if (!client) {
        return createJsonRpcError(
          request.id ?? null,
          JSON_RPC_ERRORS.INTERNAL_ERROR,
          'CalDAV client not initialized'
        );
      }
      return handleToolsCall(request, client);

    default:
      return createJsonRpcError(
        request.id ?? null,
        JSON_RPC_ERRORS.METHOD_NOT_FOUND,
        `Method not found: ${request.method}`
      );
  }
}
