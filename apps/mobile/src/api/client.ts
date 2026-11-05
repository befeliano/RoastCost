import { API_URL } from '@/lib/env';
import { secure } from '@/lib/secure';

const REFRESH_KEY = 'rc_refresh_token';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

/** Called when the session can no longer be refreshed (→ app shows the login screen). */
export function onSessionExpired(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function saveSession(s: { accessToken: string; refreshToken: string }): Promise<void> {
  accessToken = s.accessToken;
  await secure.set(REFRESH_KEY, s.refreshToken);
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  await secure.remove(REFRESH_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return secure.get(REFRESH_KEY);
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

async function doRefresh(): Promise<boolean> {
  const rt = await getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) {
      if (res.status === 401) await clearSession();
      return false;
    }
    await saveSession((await res.json()) as { accessToken: string; refreshToken: string });
    return true;
  } catch {
    return false; // offline: keep the refresh token, try later
  }
}

/** Single-flight refresh so parallel 401s trigger one rotation. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, opts: Options = {}, retried = false): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  if (auth && !accessToken && !retried) await refreshSession();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...opts.headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
  }
  if (res.status === 401 && auth && !retried) {
    if (await refreshSession()) return api<T>(path, opts, true);
    if (!(await getRefreshToken())) listeners.forEach((l) => l());
  }
  if (res.status === 204 || res.status === 304) return undefined as T;
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // a proxy/gateway HTML page instead of our JSON
    throw new ApiError(res.status, 'bad_response', friendlyMessage(res.status));
  }
  if (!res.ok) {
    const e = (
      data as { error?: { code?: string; message?: string; details?: unknown } } | undefined
    )?.error;
    throw new ApiError(
      res.status,
      e?.code ?? 'http_' + res.status,
      // 5xx and unknown shapes never surface server text
      res.status < 500 && e?.message ? e.message : friendlyMessage(res.status),
      e?.details,
    );
  }
  return data as T;
}

/** Human, Turkish wording for statuses we can't explain better. */
export function friendlyMessage(status: number): string {
  if (status === 429) return 'Çok fazla deneme yaptınız. Bir dakika bekleyip tekrar deneyin.';
  if (status === 401) return 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.';
  if (status === 403) return 'Bu işlem için yetkiniz yok.';
  if (status === 404) return 'Aradığınız kayıt bulunamadı.';
  if (status >= 500) return 'Sunucuda geçici bir sorun var. Biraz sonra tekrar deneyin.';
  return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
