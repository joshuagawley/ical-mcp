// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * OAuth Authorization Endpoint
 * Handles user authentication and authorization code generation
 *
 * Flow:
 * 1. Claude.ai redirects user to GET /oauth/authorize
 * 2. Server shows credential entry form
 * 3. User enters Apple ID + App-specific password
 * 4. Server validates credentials against iCloud CalDAV
 * 5. Server stores user credentials, generates auth code
 * 6. Server redirects back to Claude with auth code
 */

import type { DurableObjectState } from '@cloudflare/workers-types';

import type { AuthorizationRequest, AuthorizationCode, PendingAuthorization, UserCredentials } from './types';
import { STORAGE_KEYS } from './types';
import { getRegisteredClient, createOAuthErrorResponse } from './register';
import { encrypt } from './crypto';
import { AUTH_CODE_EXPIRY_MS, CALDAV_ENDPOINT, DEFAULT_SCOPE } from './constants';
import { generatePrefixedId, generateSecureToken, htmlResponse, getRequiredFormFields } from './utils';
import { renderAuthorizePage } from './templates';


/**
 * Handle GET /oauth/authorize
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
  const url = new URL(request.url);
  const params = parseAuthorizationRequest(url.searchParams);
  if (params === null) {
    return createOAuthErrorResponse('invalid_request', 'Missing or invalid parameters');
  }

  // Validate client
  const client = await getRegisteredClient(params.client_id, state);
  if (!client) {
    return createOAuthErrorResponse('invalid_client', 'Unknown client_id');
  }

  // Validate redirect_uri
  if (!client.redirectUris.includes(params.redirect_uri)) {
    return createOAuthErrorResponse('invalid_request', 'Invalid redirect_uri');
  }

  // Store pending authorization
  const pendingId = generatePendingId();
  await state.storage.put(`${STORAGE_KEYS.PENDING_PREFIX}${pendingId}`, {
    params,
    createdAt: Date.now(),
  });

  // Return HTML form
  return htmlResponse(renderAuthorizePage({ pendingId, params }));
}

/**
 * Handle POST /oauth/authorize
 * Processes the credential form submission
 *
 * @param request - The incoming HTTP request
 * @param state - Durable Object state for storage
 * @param encryptionKey - Base64-encoded 256-bit key for credential encryption
 */
export async function handleAuthorizeSubmit(
  request: Request,
  state: DurableObjectState,
  encryptionKey: string
): Promise<Response> {
  const formData = await request.formData();
  const fields = getRequiredFormFields(formData, ['pending_id', 'apple_id', 'app_password'] as const);

  if (!fields) {
    return createOAuthErrorResponse('invalid_request', 'Missing required form fields');
  }

  const { pending_id: pendingId, apple_id: appleId, app_password: appPassword } = fields;

  // Retrieve pending authorization
  const pending = await state.storage.get<PendingAuthorization>(
    `${STORAGE_KEYS.PENDING_PREFIX}${pendingId}`
  );
  if (!pending) {
    return createOAuthErrorResponse('invalid_request', 'Invalid or expired authorization');
  }

  // Validate credentials against iCloud
  const isValid = await validateICloudCredentials(appleId, appPassword);
  if (!isValid) {
    return htmlResponse(renderAuthorizePage({ pendingId, params: pending.params, error: 'Invalid credentials' }));
  }

  // Store user credentials (encrypted)
  const userId = generateUserId();
  const credentials: UserCredentials = {
    userId,
    appleId: await encrypt(appleId, encryptionKey),
    appPassword: await encrypt(appPassword, encryptionKey),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await state.storage.put(`${STORAGE_KEYS.USER_PREFIX}${userId}`, credentials);

  // Generate authorization code
  const code = generateSecureToken(32);
  const authCode: AuthorizationCode = {
    code,
    clientId: pending.params.client_id,
    redirectUri: pending.params.redirect_uri,
    userId,
    scope: pending.params.scope ?? DEFAULT_SCOPE,
    expiresAt: Date.now() + AUTH_CODE_EXPIRY_MS,
    createdAt: Date.now(),
    ...(pending.params.code_challenge && {
      codeChallenge: pending.params.code_challenge,
      codeChallengeMethod: pending.params.code_challenge_method ?? 'S256',
    }),
  };
  await state.storage.put(`${STORAGE_KEYS.AUTH_CODE_PREFIX}${code}`, authCode);

  // Clean up pending authorization
  await state.storage.delete(`${STORAGE_KEYS.PENDING_PREFIX}${pendingId}`);

  // Redirect to client
  const redirectUrl = new URL(pending.params.redirect_uri);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', pending.params.state);
  return Response.redirect(redirectUrl.toString(), 302);
}

// ============================================================================
// Helper functions (implement these)
// ============================================================================

/**
 * Parse authorization request query parameters
 */
export function parseAuthorizationRequest(params: URLSearchParams): AuthorizationRequest | null {
  const responseType = params.get('response_type');
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const state = params.get('state');

  if (!responseType || !clientId || !redirectUri || !state) {
    return null;
  }

  const scope = params.get('scope');
  const codeChallenge = params.get('code_challenge');
  const codeChallengeMethod = params.get('code_challenge_method');

  return {
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    ...(scope && { scope }),
    ...(codeChallenge && { code_challenge: codeChallenge }),
    ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
  };
}

/**
 * Validate credentials against iCloud CalDAV
 *
 * Performs a PROPFIND request to caldav.icloud.com to verify the credentials.
 * A successful response (207 Multi-Status) indicates valid credentials.
 */
export async function validateICloudCredentials(
  appleId: string,
  appPassword: string
): Promise<boolean> {
  const credentials = btoa(`${appleId}:${appPassword}`);

  const response = await fetch(`${CALDAV_ENDPOINT}/`, {
    method: 'PROPFIND',
    headers: {
      Authorization: `Basic ${credentials}`,
      Depth: '0',
      'Content-Type': 'application/xml',
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:">
  <prop>
    <current-user-principal/>
  </prop>
</propfind>`,
  }).catch(() => null);

  // 207 Multi-Status indicates successful CalDAV response
  return response?.status === 207;
}

/**
 * Generate a unique user ID
 */
export function generateUserId(): string {
  return generatePrefixedId('user');
}

/**
 * Generate a pending authorization ID
 */
export function generatePendingId(): string {
  return generatePrefixedId('pending');
}
