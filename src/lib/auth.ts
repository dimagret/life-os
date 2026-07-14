export const AUTH_COOKIE_NAME = 'lifeos_session';
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type AuthReadyConfig = {
  mode: 'ready';
  username: string;
  password: string;
  secret: string;
};

type AuthDisabledConfig = {
  mode: 'disabled';
};

type AuthMisconfiguredConfig = {
  mode: 'misconfigured';
  missing: string[];
};

export type AuthConfig = AuthReadyConfig | AuthDisabledConfig | AuthMisconfiguredConfig;

type SessionPayload = {
  sub: string;
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function isEnabledValue(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(encoder.encode(value));
}

function base64UrlDecodeString(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return decoder.decode(bytes);
  } catch {
    return null;
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const max = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;

  for (let i = 0; i < max; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return diff === 0;
}

async function hmacSha256(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

export function getAuthConfig(): AuthConfig {
  const enabledRequested =
    isEnabledValue(process.env.LIFEOS_AUTH_ENABLED) ||
    Boolean(process.env.LIFEOS_AUTH_USER || process.env.LIFEOS_AUTH_PASSWORD || process.env.LIFEOS_AUTH_SECRET);

  if (!enabledRequested) return { mode: 'disabled' };

  const username = process.env.LIFEOS_AUTH_USER?.trim() ?? '';
  const password = process.env.LIFEOS_AUTH_PASSWORD ?? '';
  const secret = process.env.LIFEOS_AUTH_SECRET ?? '';
  const missing: string[] = [];

  if (!username) missing.push('LIFEOS_AUTH_USER');
  if (password.length < 8) missing.push('LIFEOS_AUTH_PASSWORD');
  if (secret.length < 32) missing.push('LIFEOS_AUTH_SECRET');

  if (missing.length > 0) return { mode: 'misconfigured', missing };

  return { mode: 'ready', username, password, secret };
}

export function verifyAuthCredentials(username: string, password: string): boolean {
  const config = getAuthConfig();
  if (config.mode !== 'ready') return false;
  return constantTimeEqual(username.trim(), config.username) && constantTimeEqual(password, config.password);
}

export async function createAuthSessionCookie(username: string, nowMs = Date.now()): Promise<string> {
  const config = getAuthConfig();
  if (config.mode !== 'ready') {
    throw new Error('auth_not_configured');
  }

  const nowSeconds = Math.floor(nowMs / 1000);
  const payload: SessionPayload = {
    sub: username,
    iat: nowSeconds,
    exp: nowSeconds + AUTH_MAX_AGE_SECONDS,
  };
  const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
  const signature = await hmacSha256(encodedPayload, config.secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyAuthSessionCookie(value: string | undefined, nowMs = Date.now()): Promise<boolean> {
  const config = getAuthConfig();
  if (config.mode !== 'ready' || !value) return false;

  const [encodedPayload, signature] = value.split('.');
  if (!encodedPayload || !signature) return false;

  const expectedSignature = await hmacSha256(encodedPayload, config.secret);
  if (!constantTimeEqual(signature, expectedSignature)) return false;

  const decodedPayload = base64UrlDecodeString(encodedPayload);
  if (!decodedPayload) return false;

  try {
    const payload = JSON.parse(decodedPayload) as Partial<SessionPayload>;
    const nowSeconds = Math.floor(nowMs / 1000);
    return payload.sub === config.username && typeof payload.exp === 'number' && payload.exp > nowSeconds;
  } catch {
    return false;
  }
}
