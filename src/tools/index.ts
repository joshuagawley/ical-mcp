// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Tool registry and dispatch
 * Maps tool names to their handlers
 */

import type { CalDAVClient } from '../caldav/client';
import type { ToolResult } from '../types';

// Tool handler type
export interface ToolHandler<TParams, TResult> {
  readonly name: string;
  readonly description: string;
  readonly schema: Record<string, unknown>;
  execute(params: TParams, client: CalDAVClient): Promise<ToolResult<TResult>>;
}

// Registry of all available tools
// TODO: Import and register tool handlers as they are implemented
export const tools: ReadonlyMap<string, ToolHandler<unknown, unknown>> = new Map([
  // ['list_calendars', listCalendars],
  // ['list_events', listEvents],
  // ['get_event', getEvent],
  // ['create_event', createEvent],
  // ['update_event', updateEvent],
  // ['delete_event', deleteEvent],
]);

/**
 * Dispatch a tool call to the appropriate handler
 */
export async function dispatchTool(
  toolName: string,
  params: unknown,
  client: CalDAVClient
): Promise<ToolResult<unknown>> {
  const handler = tools.get(toolName);

  if (!handler) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Unknown tool: ${toolName}`,
        details: { availableTools: Array.from(tools.keys()) },
      },
    };
  }

  return handler.execute(params, client);
}
