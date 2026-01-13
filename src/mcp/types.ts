// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * MCP Protocol Types
 * JSON-RPC 2.0 message types for Model Context Protocol
 */

// JSON-RPC 2.0 base types
export interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id?: string | number | undefined;
  readonly method: string;
  readonly params?: Record<string, unknown> | undefined;
}

export interface JsonRpcResponse {
  readonly jsonrpc: '2.0';
  readonly id: string | number | null;
  readonly result: unknown;
}

export interface JsonRpcError {
  readonly jsonrpc: '2.0';
  readonly id: string | number | null;
  readonly error: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

// Standard JSON-RPC error codes
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// MCP-specific types
export interface McpCapabilities {
  readonly tools?: Record<string, never>;
  readonly resources?: {
    readonly subscribe?: boolean;
  };
}

export interface McpClientInfo {
  readonly name: string;
  readonly version: string;
}

export interface McpServerInfo {
  readonly name: string;
  readonly version: string;
}

export interface McpInitializeParams {
  readonly protocolVersion: string;
  readonly capabilities: McpCapabilities;
  readonly clientInfo: McpClientInfo;
}

export interface McpInitializeResult {
  readonly protocolVersion: string;
  readonly capabilities: McpCapabilities;
  readonly serverInfo: McpServerInfo;
}

export interface McpTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export interface McpToolsListResult {
  readonly tools: readonly McpTool[];
}

export interface McpToolContent {
  readonly type: 'text' | 'image' | 'resource';
  readonly text?: string;
  readonly data?: string;
  readonly mimeType?: string;
}

export interface McpToolsCallResult {
  readonly content: readonly McpToolContent[];
  readonly isError?: boolean;
}

export interface McpToolsCallParams {
  readonly name: string;
  readonly arguments?: Record<string, unknown>;
}

// Parse result type
export type ParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: JsonRpcError['error'] };
