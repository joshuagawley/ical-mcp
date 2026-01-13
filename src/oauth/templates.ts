// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Joshua Gawley

/**
 * HTML templates for OAuth authorization pages
 * Separates presentation from business logic
 */

import type { AuthorizationRequest } from './types';

// ============================================================================
// HTML Utilities
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================================
// Authorization Page
// ============================================================================

export interface AuthorizePageOptions {
  pendingId: string;
  params: AuthorizationRequest;
  error?: string;
}

/**
 * Render the authorization/credential entry HTML page
 *
 * The page includes:
 * - Form with Apple ID and App-specific password inputs
 * - Hidden field with pending_id
 * - Clear instructions about app-specific passwords
 * - Link to Apple's app-specific password page
 */
export function renderAuthorizePage(options: AuthorizePageOptions): string {
  const { pendingId, params, error } = options;
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
