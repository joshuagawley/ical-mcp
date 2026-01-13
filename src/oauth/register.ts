// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth Dynamic Client Registration (DCR)
 * Implements RFC 7591: OAuth 2.0 Dynamic Client Registration Protocol
 *
 * ⚠️ THIS FILE CONTAINS STUBS - Hand-write the implementation
 *
 * Claude.ai calls POST /oauth/register to register itself as an OAuth client.
 * Each Claude user gets a unique client registration.
 */

import type { RegisteredClient, OAuthError } from './types';
import type { DurableObjectState } from '@cloudflare/workers-types';

// TODO: Uncomment when implementing
// import type { ClientRegistrationRequest, ClientRegistrationResponse } from './types';
// import { STORAGE_KEYS } from './types';

/**
 * Handle POST /oauth/register
 *
 * TODO: Hand-written implementation
 *
 * This endpoint should:
 * 1. Parse the registration request body
 * 2. Validate redirect_uris (must be HTTPS, must include Claude's callback URL)
 * 3. Generate a unique client_id and client_secret
 * 4. Store the client registration in Durable Object storage
 * 5. Return the registration response
 *
 * Claude's callback URL: https://claude.ai/api/mcp/auth_callback
 * (also allowlist: https://claude.com/api/mcp/auth_callback)
 *
 * @param request - The incoming HTTP request
 * @param state - Durable Object state for storage
 */
export async function handleRegister(
  request: Request,
  state: DurableObjectState
): Promise<Response> {
  // TODO: Hand-written implementation
  // Example structure:
  //
  // const body = await request.json() as ClientRegistrationRequest;
  //
  // // Validate redirect URIs
  // if (!validateRedirectUris(body.redirect_uris)) {
  //   return createOAuthErrorResponse('invalid_request', 'Invalid redirect_uri');
  // }
  //
  // // Generate credentials
  // const clientId = generateClientId();
  // const clientSecret = generateClientSecret();
  //
  // // Store registration
  // const client: RegisteredClient = {
  //   clientId,
  //   clientSecret,
  //   redirectUris: body.redirect_uris,
  //   clientName: body.client_name ?? 'Unknown',
  //   createdAt: Date.now(),
  // };
  // await state.storage.put(`${STORAGE_KEYS.CLIENT_PREFIX}${clientId}`, client);
  //
  // // Return response
  // const response: ClientRegistrationResponse = {
  //   client_id: clientId,
  //   client_secret: clientSecret,
  //   ...
  // };
  // return Response.json(response, { status: 201 });

  void request;
  void state;

  return Response.json(
    { error: 'server_error', error_description: 'Not implemented' } satisfies OAuthError,
    { status: 501 }
  );
}

/**
 * Retrieve a registered client by client_id
 *
 * TODO: Hand-written implementation
 */
export async function getRegisteredClient(
  clientId: string,
  state: DurableObjectState
): Promise<RegisteredClient | null> {
  // TODO: Hand-written implementation
  // return state.storage.get<RegisteredClient>(`${STORAGE_KEYS.CLIENT_PREFIX}${clientId}`) ?? null;

  void clientId;
  void state;

  return null;
}

/**
 * Validate that a client_secret matches the registered client
 *
 * TODO: Hand-written implementation
 */
export function validateClientCredentials(client: RegisteredClient, clientSecret: string): boolean {
  // TODO: Hand-written implementation
  // Use constant-time comparison to prevent timing attacks
  // return crypto.subtle.timingSafeEqual(
  //   new TextEncoder().encode(client.clientSecret),
  //   new TextEncoder().encode(clientSecret)
  // );

  void client;
  void clientSecret;

  return false;
}

// ============================================================================
// Helper functions (implement these)
// ============================================================================

/**
 * Generate a cryptographically secure client ID
 *
 * TODO: Hand-written implementation
 */
export function generateClientId(): string {
  // TODO: Hand-written implementation
  // Example: return crypto.randomUUID();
  throw new Error('Not implemented');
}

/**
 * Generate a cryptographically secure client secret
 *
 * TODO: Hand-written implementation
 */
export function generateClientSecret(): string {
  // TODO: Hand-written implementation
  // Example: return base64url(crypto.getRandomValues(new Uint8Array(32)));
  throw new Error('Not implemented');
}

/**
 * Validate redirect URIs
 * - Must be HTTPS (except localhost for development)
 * - Should allowlist Claude's callback URLs
 *
 * TODO: Hand-written implementation
 */
export function validateRedirectUris(uris: readonly string[]): boolean {
  // TODO: Hand-written implementation
  // const ALLOWED_CALLBACKS = [
  //   'https://claude.ai/api/mcp/auth_callback',
  //   'https://claude.com/api/mcp/auth_callback',
  // ];
  // return uris.every(uri => {
  //   const parsed = new URL(uri);
  //   return parsed.protocol === 'https:' || parsed.hostname === 'localhost';
  // });

  void uris;

  return false;
}

/**
 * Create an OAuth error response
 */
export function createOAuthErrorResponse(
  error: OAuthError['error'],
  description?: string,
  status = 400
): Response {
  const body: OAuthError = {
    error,
    ...(description ? { error_description: description } : {}),
  };

  return Response.json(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
