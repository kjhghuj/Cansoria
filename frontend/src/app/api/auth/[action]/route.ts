import { NextRequest } from 'next/server';
import { backendFetch, CART_COOKIE, cookieOptions, privateJson, safeBackendFailure, SESSION_COOKIE } from '@/lib/server-medusa';
import { isSameOriginWrite, readBoundedJson } from '@/lib/store-proxy-policy';

export const runtime = 'nodejs';
type Context = { params: Promise<{ action: string }> };

function sessionLifetime(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return Math.max(0, Math.min(8 * 3600, Math.floor(payload.exp - Date.now() / 1000)));
  } catch { return 0; }
}

export async function POST(request: NextRequest, context: Context) {
  const { action } = await context.params;
  if (!['login', 'register', 'logout', 'request-password-reset', 'reset-password'].includes(action)) return privateJson({ message: 'Not found.' }, 404);
  if (!isSameOriginWrite(request)) return privateJson({ message: 'Access denied.' }, 403);
  if (action === 'logout') {
    const response = privateJson({ success: true });
    response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    response.cookies.set(CART_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    return response;
  }
  let body: Record<string, unknown>;
  try { body = await readBoundedJson(request, 16 * 1024); }
  catch { return privateJson({ message: 'Invalid request.' }, 400); }
  const { email, password, first_name, last_name, token } = body;

  if (action === 'request-password-reset') {
    // The backend always answers 201 without revealing whether the identity
    // exists; mirror that so this proxy never leaks account existence.
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return privateJson({ message: 'Enter a valid email address.' }, 400);
    }
    try {
      const reset = await backendFetch('auth/customer/emailpass/reset-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: email.trim() }),
        headers: { Authorization: '' },
      }, undefined, request);
      if (reset.status === 429) return safeBackendFailure(reset);
    } catch { /* Response stays uniform for unknown emails. */ }
    return privateJson({ success: true });
  }

  if (action === 'reset-password') {
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
      return privateJson({ message: 'This reset link is invalid or has expired. Please request a new one.' }, 400);
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 256) {
      return privateJson({ message: 'Choose a password with at least 8 characters.' }, 400);
    }
    try {
      const update = await backendFetch('auth/customer/emailpass/update', {
        method: 'POST',
        body: JSON.stringify({ password }),
        headers: { Authorization: `Bearer ${token}` },
      }, undefined, request);
      if (update.status === 429) return safeBackendFailure(update);
      if (!update.ok) return privateJson({ message: 'This reset link is invalid or has expired. Please request a new one.' }, 400);
      return privateJson({ success: true });
    } catch {
      return privateJson({ message: 'The service is temporarily unavailable.' }, 503);
    }
  }

  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length > 256 || password.length < (action === 'register' ? 8 : 1)) {
    return privateJson({ message: 'Invalid credentials.' }, 400);
  }
  if (action === 'register' && (typeof first_name !== 'string' || first_name.length > 100 || typeof last_name !== 'string' || last_name.length > 100)) return privateJson({ message: 'Invalid request.' }, 400);

  try {
    const suppliedEmail = email.trim();
    const normalizedEmail = suppliedEmail.toLowerCase();
    const credentials = JSON.stringify({ email: action === 'register' ? normalizedEmail : suppliedEmail, password });
    let auth = await backendFetch(`auth/customer/emailpass${action === 'register' ? '/register' : ''}`, { method: 'POST', body: credentials, headers: { Authorization: '' } }, undefined, request);
    // Medusa identities are case-sensitive. Preserve legacy identities, while supporting
    // mixed-case input for accounts created by this normalized registration endpoint.
    if (action === 'login' && suppliedEmail !== normalizedEmail && [400, 401].includes(auth.status)) {
      auth = await backendFetch('auth/customer/emailpass', { method: 'POST', body: JSON.stringify({ email: normalizedEmail, password }), headers: { Authorization: '' } }, undefined, request);
    }
    if (auth.status === 429) return safeBackendFailure(auth);
    if (!auth.ok) return privateJson({ message: action === 'login' ? 'Invalid email or password.' : 'Unable to create account. Please sign in or try again.' }, auth.status >= 500 ? 503 : 400);
    let { token } = await auth.json();
    if (typeof token !== 'string' || token.length > 4096) throw new Error('Invalid auth response');
    if (action === 'register') {
      const profile = await backendFetch('store/customers', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim().toLowerCase(), first_name, last_name }),
      }, undefined, request);
      if (profile.status === 429) return safeBackendFailure(profile);
      if (!profile.ok) return privateJson({ message: 'Unable to create account. Please sign in or try again.' }, profile.status >= 500 ? 503 : 400);
      // The registration token has no customer actor ID until the profile exists.
      const refreshed = await backendFetch('auth/customer/emailpass', { method: 'POST', body: credentials, headers: { Authorization: '' } }, undefined, request);
      if (refreshed.status === 429) return safeBackendFailure(refreshed);
      if (!refreshed.ok) throw new Error('Unable to initialize session');
      ({ token } = await refreshed.json());
    }
    if (typeof token !== 'string' || token.length > 4096) throw new Error('Invalid auth response');
    const maxAge = sessionLifetime(token);
    if (!maxAge) throw new Error('Expired session');
    const response = privateJson({ success: true });
    response.cookies.set(SESSION_COOKIE, token, { ...cookieOptions, maxAge });
    return response;
  } catch {
    return privateJson({ message: 'The service is temporarily unavailable.' }, 503);
  }
}
