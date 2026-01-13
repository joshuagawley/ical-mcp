// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth Authorization Endpoint
 * Handles user authentication and authorization code generation
 *
 * ⚠️ THIS FILE CONTAINS STUBS - Hand-write the implementation
 *
 * Flow:
 * 1. Claude.ai redirects user to GET /oauth/authorize
 * 2. Server shows credential entry form
 * 3. User enters Apple ID + App-specific password
 * 4. Server validates credentials against iCloud CalDAV
 * 5. Server stores user credentials, generates auth code
 * 6. Server redirects back to Claude with auth code
 */

import type { AuthorizationRequest, OAuthError } from './types';
import type { DurableObjectState } from '@cloudflare/workers-types';

// TODO: Uncomment when implementing
// import type { AuthorizationCode, PendingAuthorization, UserCredentials } from './types';
// import { STORAGE_KEYS } from './types';
// import { getRegisteredClient, createOAuthErrorResponse } from './register';

/**
 * Handle GET /oauth/authorize
 * Shows the credential entry form to the user
 *
 * TODO: Hand-written implementation
 *
 * This endpoint should:
 * 1. Parse and validate query parameters (client_id, redirect_uri, state, etc.)
 * 2. Verify client_id is registered
 * 3. Verify redirect_uri matches registered URIs
 * 4. Store the pending authorization request
 * 5. Return an HTML page with credential entry form
 *
 * @param request - The incoming HTTP request
 * @param state - Durable Object state for storage
 */
export async function handleAuthorize(
  request: Request,
  state: DurableObjectState
): Promise<Response> {
  // TODO: Hand-written implementation
  // Example structure:
  //
  // const url = new URL(request.url);
  // const params = parseAuthorizationRequest(url.searchParams);
  //
  // // Validate client
  // const client = await getRegisteredClient(params.client_id, state);
  // if (!client) {
  //   return createOAuthErrorResponse('invalid_client', 'Unknown client_id');
  // }
  //
  // // Validate redirect_uri
  // if (!client.redirectUris.includes(params.redirect_uri)) {
  //   return createOAuthErrorResponse('invalid_request', 'Invalid redirect_uri');
  // }
  //
  // // Store pending authorization
  // const pendingId = generatePendingId();
  // await state.storage.put(`${STORAGE_KEYS.PENDING_PREFIX}${pendingId}`, {
  //   params,
  //   createdAt: Date.now(),
  // });
  //
  // // Return HTML form
  // return new Response(renderAuthorizePage(pendingId, params), {
  //   headers: { 'Content-Type': 'text/html' },
  // });

  void request;
  void state;

  return Response.json(
    { error: 'server_error', error_description: 'Not implemented' } satisfies OAuthError,
    { status: 501 }
  );
}

/**
 * Handle POST /oauth/authorize
 * Processes the credential form submission
 *
 * TODO: Hand-written implementation
 *
 * This endpoint should:
 * 1. Parse form data (pending_id, apple_id, app_password)
 * 2. Retrieve pending authorization
 * 3. Validate credentials against iCloud CalDAV
 * 4. Store user credentials (encrypted)
 * 5. Generate authorization code
 * 6. Redirect to client with code and state
 *
 * @param request - The incoming HTTP request
 * @param state - Durable Object state for storage
 */
export async function handleAuthorizeSubmit(
  request: Request,
  state: DurableObjectState
): Promise<Response> {
  // TODO: Hand-written implementation
  // Example structure:
  //
  // const formData = await request.formData();
  // const pendingId = formData.get('pending_id') as string;
  // const appleId = formData.get('apple_id') as string;
  // const appPassword = formData.get('app_password') as string;
  //
  // // Retrieve pending authorization
  // const pending = await state.storage.get<PendingAuthorization>(
  //   `${STORAGE_KEYS.PENDING_PREFIX}${pendingId}`
  // );
  // if (!pending) {
  //   return createOAuthErrorResponse('invalid_request', 'Invalid or expired authorization');
  // }
  //
  // // Validate credentials against iCloud
  // const isValid = await validateICloudCredentials(appleId, appPassword);
  // if (!isValid) {
  //   return renderAuthorizePage(pendingId, pending.params, 'Invalid credentials');
  // }
  //
  // // Store user credentials
  // const userId = generateUserId();
  // const credentials: UserCredentials = {
  //   userId,
  //   appleId: encrypt(appleId),
  //   appPassword: encrypt(appPassword),
  //   createdAt: Date.now(),
  //   updatedAt: Date.now(),
  // };
  // await state.storage.put(`${STORAGE_KEYS.USER_PREFIX}${userId}`, credentials);
  //
  // // Generate authorization code
  // const code = generateAuthorizationCode();
  // const authCode: AuthorizationCode = {
  //   code,
  //   clientId: pending.params.client_id,
  //   redirectUri: pending.params.redirect_uri,
  //   userId,
  //   scope: pending.params.scope ?? 'calendar:read calendar:write',
  //   codeChallenge: pending.params.code_challenge,
  //   codeChallengeMethod: pending.params.code_challenge_method,
  //   expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  //   createdAt: Date.now(),
  // };
  // await state.storage.put(`${STORAGE_KEYS.AUTH_CODE_PREFIX}${code}`, authCode);
  //
  // // Clean up pending authorization
  // await state.storage.delete(`${STORAGE_KEYS.PENDING_PREFIX}${pendingId}`);
  //
  // // Redirect to client
  // const redirectUrl = new URL(pending.params.redirect_uri);
  // redirectUrl.searchParams.set('code', code);
  // redirectUrl.searchParams.set('state', pending.params.state);
  // return Response.redirect(redirectUrl.toString(), 302);

  void request;
  void state;

  return Response.json(
    { error: 'server_error', error_description: 'Not implemented' } satisfies OAuthError,
    { status: 501 }
  );
}

// ============================================================================
// Helper functions (implement these)
// ============================================================================

/**
 * Parse authorization request query parameters
 *
 * TODO: Hand-written implementation
 */
export function parseAuthorizationRequest(params: URLSearchParams): AuthorizationRequest | null {
  // TODO: Hand-written implementation
  // const responseType = params.get('response_type');
  // const clientId = params.get('client_id');
  // const redirectUri = params.get('redirect_uri');
  // const state = params.get('state');
  //
  // if (!responseType || !clientId || !redirectUri || !state) {
  //   return null;
  // }
  //
  // return {
  //   response_type: responseType,
  //   client_id: clientId,
  //   redirect_uri: redirectUri,
  //   state,
  //   scope: params.get('scope') ?? undefined,
  //   code_challenge: params.get('code_challenge') ?? undefined,
  //   code_challenge_method: params.get('code_challenge_method') ?? undefined,
  // };

  void params;

  return null;
}

/**
 * Validate credentials against iCloud CalDAV
 *
 * TODO: Hand-written implementation
 */
export async function validateICloudCredentials(
  appleId: string,
  appPassword: string
): Promise<boolean> {
  // TODO: Hand-written implementation
  // Try a simple PROPFIND request to caldav.icloud.com
  // Similar to the /test-auth endpoint logic

  void appleId;
  void appPassword;

  return false;
}

/**
 * Generate a unique user ID
 *
 * TODO: Hand-written implementation
 */
export function generateUserId(): string {
  // TODO: Hand-written implementation
  throw new Error('Not implemented');
}

/**
 * Generate a cryptographically secure authorization code
 *
 * TODO: Hand-written implementation
 */
export function generateAuthorizationCode(): string {
  // TODO: Hand-written implementation
  throw new Error('Not implemented');
}

/**
 * Generate a pending authorization ID
 *
 * TODO: Hand-written implementation
 */
export function generatePendingId(): string {
  // TODO: Hand-written implementation
  throw new Error('Not implemented');
}

/**
 * Render the authorization/credential entry HTML page
 *
 * TODO: Hand-written implementation
 *
 * The page should include:
 * - Form with Apple ID and App-specific password inputs
 * - Hidden field with pending_id
 * - CSRF protection
 * - Clear instructions about app-specific passwords
 * - Link to Apple's app-specific password page
 */
export function renderAuthorizePage(
  pendingId: string,
  params: AuthorizationRequest,
  error?: string
): string {
  // TODO: Hand-written implementation
  // Return an HTML string with the credential entry form

  void pendingId;
  void params;
  void error;

  return `<!DOCTYPE html>
<html>
<head><title>Authorization - Not Implemented</title></head>
<body>
  <h1>Not Implemented</h1>
  <p>This authorization page needs to be implemented.</p>
</body>
</html>`;
}
