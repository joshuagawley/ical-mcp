// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth Token Endpoint
 * Handles authorization code exchange and token refresh
 *
 * ⚠️ THIS FILE CONTAINS STUBS - Hand-write the implementation
 *
 * Claude.ai calls POST /oauth/token to:
 * 1. Exchange authorization code for access token
 * 2. Refresh expired access tokens
 */

import { createOAuthErrorResponse } from './register';

import type { TokenRequest, OAuthError } from './types';
import type { DurableObjectState } from '@cloudflare/workers-types';

// TODO: Uncomment when implementing
// import type { TokenResponse, AuthorizationCode, UserSession } from './types';
// import { STORAGE_KEYS } from './types';
// import { getRegisteredClient, validateClientCredentials } from './register';

/**
 * Handle POST /oauth/token
 *
 * TODO: Hand-written implementation
 *
 * This endpoint should handle two grant types:
 *
 * 1. authorization_code:
 *    - Validate client credentials
 *    - Verify authorization code exists and hasn't expired
 *    - Verify redirect_uri matches
 *    - Verify PKCE code_verifier (if code_challenge was provided)
 *    - Generate access token and refresh token
 *    - Store session
 *    - Delete authorization code (single use)
 *    - Return token response
 *
 * 2. refresh_token:
 *    - Validate client credentials
 *    - Verify refresh token exists and is valid
 *    - Generate new access token
 *    - Optionally rotate refresh token
 *    - Update session
 *    - Return token response
 *
 * @param request - The incoming HTTP request
 * @param state - Durable Object state for storage
 */
export async function handleToken(request: Request, state: DurableObjectState): Promise<Response> {
  // TODO: Hand-written implementation
  // Example structure:
  //
  // const body = await parseTokenRequest(request);
  // if (!body) {
  //   return createOAuthErrorResponse('invalid_request', 'Invalid request body');
  // }
  //
  // // Validate client
  // const client = await getRegisteredClient(body.client_id, state);
  // if (!client) {
  //   return createOAuthErrorResponse('invalid_client', 'Unknown client');
  // }
  //
  // if (body.client_secret && !validateClientCredentials(client, body.client_secret)) {
  //   return createOAuthErrorResponse('invalid_client', 'Invalid client credentials');
  // }
  //
  // switch (body.grant_type) {
  //   case 'authorization_code':
  //     return handleAuthorizationCodeGrant(body, client, state);
  //   case 'refresh_token':
  //     return handleRefreshTokenGrant(body, client, state);
  //   default:
  //     return createOAuthErrorResponse('unsupported_grant_type');
  // }

  void request;
  void state;

  return Response.json(
    { error: 'server_error', error_description: 'Not implemented' } satisfies OAuthError,
    { status: 501 }
  );
}

/**
 * Handle authorization_code grant type
 *
 * TODO: Hand-written implementation
 * Export this and call from handleToken when implementing
 */
export async function handleAuthorizationCodeGrant(
  body: TokenRequest,
  state: DurableObjectState
): Promise<Response> {
  // TODO: Hand-written implementation
  // 1. Retrieve authorization code
  // const authCode = await state.storage.get<AuthorizationCode>(
  //   `${STORAGE_KEYS.AUTH_CODE_PREFIX}${body.code}`
  // );
  //
  // 2. Validate code
  // if (!authCode || authCode.expiresAt < Date.now()) {
  //   return createOAuthErrorResponse('invalid_grant', 'Invalid or expired code');
  // }
  //
  // 3. Validate redirect_uri
  // if (authCode.redirectUri !== body.redirect_uri) {
  //   return createOAuthErrorResponse('invalid_grant', 'redirect_uri mismatch');
  // }
  //
  // 4. Validate PKCE if present
  // if (authCode.codeChallenge) {
  //   if (!verifyCodeVerifier(body.code_verifier, authCode.codeChallenge, authCode.codeChallengeMethod)) {
  //     return createOAuthErrorResponse('invalid_grant', 'Invalid code_verifier');
  //   }
  // }
  //
  // 5. Generate tokens
  // const accessToken = generateAccessToken();
  // const refreshToken = generateRefreshToken();
  //
  // 6. Create session
  // const session: UserSession = {
  //   userId: authCode.userId,
  //   accessToken,
  //   refreshToken,
  //   expiresAt: Date.now() + 3600 * 1000, // 1 hour
  //   scope: authCode.scope,
  //   createdAt: Date.now(),
  //   lastUsedAt: Date.now(),
  // };
  // await state.storage.put(`${STORAGE_KEYS.SESSION_PREFIX}${accessToken}`, session);
  //
  // 7. Delete authorization code (single use)
  // await state.storage.delete(`${STORAGE_KEYS.AUTH_CODE_PREFIX}${body.code}`);
  //
  // 8. Return token response
  // return Response.json({
  //   access_token: accessToken,
  //   token_type: 'Bearer',
  //   expires_in: 3600,
  //   refresh_token: refreshToken,
  //   scope: authCode.scope,
  // } satisfies TokenResponse);

  void body;
  void state;

  return createOAuthErrorResponse('server_error', 'Not implemented', 501);
}

/**
 * Handle refresh_token grant type
 *
 * TODO: Hand-written implementation
 * Export this and call from handleToken when implementing
 */
export async function handleRefreshTokenGrant(
  body: TokenRequest,
  state: DurableObjectState
): Promise<Response> {
  // TODO: Hand-written implementation
  // 1. Find session by refresh token
  // 2. Validate session exists and refresh token matches
  // 3. Generate new access token
  // 4. Optionally rotate refresh token
  // 5. Update session
  // 6. Return token response

  void body;
  void state;

  return createOAuthErrorResponse('server_error', 'Not implemented', 501);
}

// ============================================================================
// Helper functions (implement these)
// ============================================================================

/**
 * Parse token request from form body or JSON
 *
 * TODO: Hand-written implementation
 */
export async function parseTokenRequest(request: Request): Promise<TokenRequest | null> {
  // TODO: Hand-written implementation
  // Token requests can be form-encoded or JSON
  // const contentType = request.headers.get('Content-Type') ?? '';
  //
  // if (contentType.includes('application/x-www-form-urlencoded')) {
  //   const formData = await request.formData();
  //   return {
  //     grant_type: formData.get('grant_type') as string,
  //     code: formData.get('code') as string | undefined,
  //     ...
  //   };
  // }
  //
  // if (contentType.includes('application/json')) {
  //   return await request.json() as TokenRequest;
  // }

  void request;

  return null;
}

/**
 * Generate a cryptographically secure access token
 *
 * TODO: Hand-written implementation
 */
export function generateAccessToken(): string {
  // TODO: Hand-written implementation
  throw new Error('Not implemented');
}

/**
 * Generate a cryptographically secure refresh token
 *
 * TODO: Hand-written implementation
 */
export function generateRefreshToken(): string {
  // TODO: Hand-written implementation
  throw new Error('Not implemented');
}

/**
 * Verify PKCE code_verifier against code_challenge
 *
 * TODO: Hand-written implementation
 *
 * For S256 method:
 * BASE64URL(SHA256(code_verifier)) === code_challenge
 */
export async function verifyCodeVerifier(
  codeVerifier: string | undefined,
  codeChallenge: string,
  method: string | undefined
): Promise<boolean> {
  // TODO: Hand-written implementation
  // if (!codeVerifier) return false;
  //
  // if (method === 'S256') {
  //   const hash = await crypto.subtle.digest(
  //     'SHA-256',
  //     new TextEncoder().encode(codeVerifier)
  //   );
  //   const expected = base64url(new Uint8Array(hash));
  //   return expected === codeChallenge;
  // }
  //
  // // Plain method (not recommended)
  // if (method === 'plain') {
  //   return codeVerifier === codeChallenge;
  // }

  void codeVerifier;
  void codeChallenge;
  void method;

  return false;
}
