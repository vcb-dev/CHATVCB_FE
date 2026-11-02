export const API_URL = (import.meta.env.VITE_APP_URL ?? "/api").replace(/\/$/, "");

const REFRESH_LOCK = "chatvcb.refresh";
const REFRESH_TIMEOUT_MS = 15000;
const CSRF_REJECTED = "CSRF token không hợp lệ";
const UNAVAILABLE = "Không kết nối được máy chủ";
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register"];

type RefreshResult = "ok" | "expired" | "unavailable";

export class SessionExpiredError extends Error {
  constructor() {
    super("Phiên đăng nhập hết hạn");
    this.name = "SessionExpiredError";
  }
}

// Chỉ giữ trong RAM: Electron chạy từ file:// không đọc được cookie của domain BE
let csrfToken: string | null = null;
let inflight: Promise<RefreshResult> | null = null;

export function setCsrf(token: string | null) {
  csrfToken = token;
}

export function authHeaders(): Record<string, string> {
  return {
    "x-auth-mode": "cookie",
    ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
  };
}

async function withCrossTabLock(
  fn: () => Promise<RefreshResult>,
): Promise<RefreshResult> {
  return navigator.locks ? await navigator.locks.request(REFRESH_LOCK, fn) : fn();
}

async function callAuth(path: string, method: string): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: authHeaders(),
    signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
  });
}

async function adoptCsrf(response: Response) {
  const body = (await response.json()) as { csrfToken?: string };
  setCsrf(body.csrfToken ?? null);
}

async function doRefresh(): Promise<RefreshResult> {
  try {
    // Tab khác có thể đã refresh xong trong lúc chờ khóa, mà cookie refresh thì JS không đọc được
    const probe = await callAuth("/auth/session", "GET");
    if (probe.ok) {
      await adoptCsrf(probe);
      return "ok";
    }
    if (probe.status !== 401) {
      return "unavailable";
    }
    const refreshed = await callAuth("/auth/refresh", "POST");
    if (refreshed.ok) {
      await adoptCsrf(refreshed);
      return "ok";
    }
    return refreshed.status === 401 || refreshed.status === 403
      ? "expired"
      : "unavailable";
  } catch {
    return "unavailable";
  }
}

export function refreshSession(): Promise<RefreshResult> {
  inflight ??= withCrossTabLock(doRefresh).finally(() => {
    inflight = null;
  });
  return inflight;
}

function expireSession(): SessionExpiredError {
  setCsrf(null);
  window.dispatchEvent(new CustomEvent("chatvcb:unauthorized"));
  return new SessionExpiredError();
}

async function isCsrfRejected(response: Response) {
  if (response.status !== 403) {
    return false;
  }
  const body = (await response.clone().json().catch(() => null)) as {
    message?: string;
  } | null;
  return body?.message === CSRF_REJECTED;
}

export async function authedFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const send = () =>
    fetch(url, {
      ...init,
      credentials: "include",
      headers: { ...authHeaders(), ...init?.headers },
    });

  const response = await send();
  if (NO_REFRESH_PATHS.some((path) => url.includes(path))) {
    return response;
  }
  // CSRF cũ cũng xử lý như 401: CsrfGuard chạy trước JWT, và tab khác refresh sẽ đổi CSRF
  if (response.status !== 401 && !(await isCsrfRejected(response))) {
    return response;
  }

  const result = await refreshSession();
  if (result === "unavailable") {
    throw new Error(UNAVAILABLE);
  }
  if (result === "expired") {
    throw expireSession();
  }
  const retried = await send();
  if (retried.status === 401) {
    throw expireSession();
  }
  return retried;
}
