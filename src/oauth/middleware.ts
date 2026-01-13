// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth Middleware for MCP Endpoint
 * Validates Bearer tokens and retrieves user credentials
 *
 * ⚠️ THIS FILE CONTAINS STUBS - Hand-write the implementation
 *
 * This middleware:
 * 1. Extracts Bearer token from Authorization header
 * 2. Looks up session by access token
 * 3. Retrieves user's iCloud credentials
 * 4. Returns credentials for CalDAV client creation
 */

import type { Credentials } from '../auth/credentials';
import type { DurableObjectState } from '@cloudflare/workers-types';

// TODO: Uncomment when implementing
// import type { UserSession, UserCredentials } from './types';
// import { STORAGE_KEYS } from './types';

/**
 * Result of validating an OAuth token
 */
export type TokenValidationResult =
  | { valid: true; credentials: Credentials; userId: string }
  | { valid: false; error: string; status: number };

/**
 * Validate Bearer token and retrieve user credentials
 *
 * TODO: Hand-written implementation
 *
 * This function should:
 * 1. Extract Bearer token from Authorization header
 * 2. Look up session by access token
 * 3. Check if session has expired
 * 4. Retrieve user credentials by userId
 * 5. Decrypt credentials
 * 6. Return credentials for CalDAV client
 *
 * @param request - The incoming HTTP request
 * @param state - Durable Object state for storage
 */
export async function validateToken(
  request: Request,
  state: DurableObjectState
): Promise<TokenValidationResult> {
  // TODO: Hand-written implementation
  // Example structure:
  //
  // // Extract token
  // const authHeader = request.headers.get('Authorization');
  // if (!authHeader?.startsWith('Bearer ')) {
  //   return { valid: false, error: 'Missing or invalid Authorization header', status: 401 };
  // }
  // const token = authHeader.slice(7);
  //
  // // Look up session
  // const session = await state.storage.get<UserSession>(
  //   `${STORAGE_KEYS.SESSION_PREFIX}${token}`
  // );
  // if (!session) {
  //   return { valid: false, error: 'Invalid token', status: 401 };
  // }
  //
  // // Check expiration
  // if (session.expiresAt < Date.now()) {
  //   return { valid: false, error: 'Token expired', status: 401 };
  // }
  //
  // // Get user credentials
  // const userCredentials = await state.storage.get<UserCredentials>(
  //   `${STORAGE_KEYS.USER_PREFIX}${session.userId}`
  // );
  // if (!userCredentials) {
  //   return { valid: false, error: 'User not found', status: 401 };
  // }
  //
  // // Update last used timestamp
  // await state.storage.put(`${STORAGE_KEYS.SESSION_PREFIX}${token}`, {
  //   ...session,
  //   lastUsedAt: Date.now(),
  // });
  //
  // // Decrypt and return credentials
  // return {
  //   valid: true,
  //   credentials: {
  //     appleId: decrypt(userCredentials.appleId),
  //     appSpecificPassword: decrypt(userCredentials.appPassword),
  //   },
  //   userId: session.userId,
  // };

  void request;
  void state;

  return {
    valid: false,
    error: 'OAuth not implemented',
    status: 501,
  };
}

/**
 * Extract Bearer token from Authorization header
 *
 * TODO: Hand-written implementation
 */
export function extractBearerToken(request: Request): string | null {
  // TODO: Hand-written implementation
  // const authHeader = request.headers.get('Authorization');
  // if (!authHeader?.startsWith('Bearer ')) {
  //   return null;
  // }
  // return authHeader.slice(7);

  void request;

  return null;
}

/**
 * Check if a request has a Bearer token
 * Used to determine if OAuth validation should be required
 */
export function hasBearerToken(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  return authHeader?.startsWith('Bearer ') ?? false;
}

/**
 * Create a 401 Unauthorized response with WWW-Authenticate header
 * This tells the client that OAuth is required
 */
export function createUnauthorizedResponse(error?: string): Response {
  return new Response(
    JSON.stringify({
      error: 'unauthorized',
      error_description: error ?? 'Authentication required',
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="ical-mcp"',
      },
    }
  );
}
