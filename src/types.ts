// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * Shared TypeScript types for the iCal MCP server
 */

// Tool result types
export interface ToolSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface ToolError {
  readonly success: false;
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
}

export type ToolResult<T> = ToolSuccess<T> | ToolError;

export type ErrorCode =
  | 'NOT_FOUND'
  | 'AUTH_FAILED'
  | 'CALDAV_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR';

// Calendar event types
export interface CalendarEvent {
  readonly uid: string;
  readonly summary: string;
  readonly dtstart: string; // ISO 8601 UTC
  readonly dtend: string; // ISO 8601 UTC
  readonly location?: string;
  readonly description?: string;
  readonly isRecurring: boolean;
  readonly recurrenceId?: string;
}

export interface Calendar {
  readonly href: string;
  readonly displayName: string;
  readonly color?: string;
}

// Cloudflare Workers environment bindings
export interface Env {
  MCP_SERVER: DurableObjectNamespace;
  APPLE_ID: string;
  APP_PASSWORD: string;
}
