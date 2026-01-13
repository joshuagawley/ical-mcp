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

import type { AuthorizationRequest, OAuthError } from './types';
import type { DurableObjectState } from '@cloudflare/workers-types';

import type { AuthorizationCode, PendingAuthorization, UserCredentials } from './types';
import { STORAGE_KEYS } from './types';
import { getRegisteredClient, createOAuthErrorResponse } from './register';
import { encrypt } from './crypto';

/**
 * Create an HTML response
 */
function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html' },
  });
}


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
  return htmlResponse(renderAuthorizePage(pendingId, params));
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
 * @param encryptionKey - Base64-encoded 256-bit key for credential encryption
 */
export async function handleAuthorizeSubmit(
  request: Request,
  state: DurableObjectState,
  encryptionKey: string
): Promise<Response> {
  const formData = await request.formData();
  const pendingId = formData.get('pending_id') as string;
  const appleId = formData.get('apple_id') as string;
  const appPassword = formData.get('app_password') as string;

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
    return htmlResponse(renderAuthorizePage(pendingId, pending.params, 'Invalid credentials'));
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
  const code = generateAuthorizationCode();
  const authCode: AuthorizationCode = {
    code,
    clientId: pending.params.client_id,
    redirectUri: pending.params.redirect_uri,
    userId,
    scope: pending.params.scope ?? 'calendar:read calendar:write',
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
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

  try {
    const response = await fetch('https://caldav.icloud.com/', {
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
    });

    // 207 Multi-Status indicates successful CalDAV response
    return response.status === 207;
  } catch {
    return false;
  }
}

/**
 * Generate a unique user ID
 *
 * Uses crypto.randomUUID() prefixed with 'user_' for identification
 */
export function generateUserId(): string {
  return `user_${crypto.randomUUID()}`;
}

/**
 * Generate a cryptographically secure authorization code
 *
 * Returns a 32-byte random value encoded as base64url (no padding)
 */
export function generateAuthorizationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  // Convert to base64url (URL-safe, no padding)
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a pending authorization ID
 *
 * Uses crypto.randomUUID() prefixed with 'pending_' for identification
 */
export function generatePendingId(): string {
  return `pending_${crypto.randomUUID()}`;
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
  // Could look up client name from storage, but for now just show the client_id
  const clientDisplay = escapeHtml(params.client_id);
  const scopeDisplay = params.scope ? escapeHtml(params.scope) : 'calendar access';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect to Apple Calendar</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 400px; margin: 40px auto; padding: 20px; }
    h1 { font-size: 1.5rem; }
    label { display: block; margin-top: 1rem; font-weight: 500; }
    input { width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    button { margin-top: 1.5rem; width: 100%; padding: 10px; background: #007AFF; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; }
    button:hover { background: #0056b3; }
    .error { color: #c00; margin-bottom: 1rem; padding: 10px; background: #fee; border-radius: 4px; }
    .help { margin-top: 1rem; font-size: 0.875rem; color: #666; }
    .scope { font-size: 0.875rem; color: #333; background: #f5f5f5; padding: 8px; border-radius: 4px; margin-top: 0.5rem; }
    a { color: #007AFF; }
  </style>
</head>
<body>
  <h1>Connect to Apple Calendar</h1>
  <p><strong>${clientDisplay}</strong> is requesting ${scopeDisplay}.</p>
  ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
  <form method="POST" action="/oauth/authorize">
    <input type="hidden" name="pending_id" value="${escapeHtml(pendingId)}">
    <label>
      Apple ID
      <input type="email" name="apple_id" required autocomplete="username">
    </label>
    <label>
      App-Specific Password
      <input type="password" name="app_password" required autocomplete="current-password" placeholder="xxxx-xxxx-xxxx-xxxx">
    </label>
    <button type="submit">Connect</button>
  </form>
  <p class="help">
    You need an <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener">app-specific password</a> from Apple. 
    Your regular Apple ID password won't work.
  </p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

