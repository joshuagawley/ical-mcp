// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth Dynamic Client Registration (DCR)
 * Implements RFC 7591: OAuth 2.0 Dynamic Client Registration Protocol
 *
 * Claude.ai calls POST /oauth/register to register itself as an OAuth client.
 * Each Claude user gets a unique client registration.
 */

import { STORAGE_KEYS } from './types';

import type { RegisteredClient, OAuthError } from './types';
import type { ClientRegistrationRequest, ClientRegistrationResponse } from './types';
import type { DurableObjectState } from '@cloudflare/workers-types';
import { Buffer } from 'node:buffer';

/**
 * Handle POST /oauth/register
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
  const body = (await request.json()) as ClientRegistrationRequest;

  // Validate redirect URIs
  if (!body.redirect_uris || !validateRedirectUris(body.redirect_uris)) {
    return createOAuthErrorResponse('invalid_request', 'Invalid redirect_uri', 400);
  }

  // Generate credentials
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();

  // Store registration
  const client: RegisteredClient = {
    clientId,
    clientSecret,
    redirectUris: body.redirect_uris,
    clientName: body.client_name ?? 'Unknown',
    createdAt: Date.now(),
  };
  await state.storage.put(`${STORAGE_KEYS.CLIENT_PREFIX}${clientId}`, client);

  // Return response
  const response: ClientRegistrationResponse = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: body.redirect_uris,
    client_name: body.client_name ?? 'Unknown',
    client_id_issued_at: Math.floor(client.createdAt / 1000),
    grant_types: ['authorization_code', 'refresh_token'] as const,
    token_endpoint_auth_method: 'client_secret_post',
    response_types: ['code'],
  } as const;
  return Response.json(response, { status: 201 });
}

/**
 * Retrieve a registered client by client_id
 */
export async function getRegisteredClient(
  clientId: string,
  state: DurableObjectState
): Promise<RegisteredClient | null> {
  return await state.storage.get<RegisteredClient>(`${STORAGE_KEYS.CLIENT_PREFIX}${clientId}`) ?? null;
}

/**
 * Validate that a client_secret matches the registered client
 */
export function validateClientCredentials(client: RegisteredClient, clientSecret: string): boolean {
  // Use constant-time comparison to prevent timing attacks
  return crypto.subtle.timingSafeEqual(
    new TextEncoder().encode(client.clientSecret),
    new TextEncoder().encode(clientSecret)
  );
}

// ============================================================================
// Helper functions (implement these)
// ============================================================================

/**
 * Generate a cryptographically secure client ID
 */
export function generateClientId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a cryptographically secure client secret
 */
export function generateClientSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString('base64url');
}

/**
 * Validate redirect URIs
 * - Must be HTTPS (except localhost for development)
 * - Should allowlist Claude's callback URLs
 */
export function validateRedirectUris(uris: readonly string[]): boolean {
  if (uris.length === 0) {
    return false;
  }

  const ALLOWED_CALLBACKS = [
    'https://claude.ai/api/mcp/auth_callback',
    'https://claude.com/api/mcp/auth_callback',
  ];


  return uris.every(uri => {
    if (!URL.canParse(uri)) {
      return false;
    }
    const parsed = new URL(uri);
    // Must be either be localhost (for development)
    // or is HTTPS and in allowlist
    return parsed.hostname === 'localhost'
      || (parsed.protocol === 'https:' && ALLOWED_CALLBACKS.includes(uri));
  });
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
