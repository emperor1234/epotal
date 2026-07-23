export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 20_000;

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
  const { accessToken, headers, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${API_URL.replace(/\/$/, '')}/api${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    throw new ApiRequestError(0, timedOut ? 'The server took too long to respond.' : 'Unable to connect. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiRequestError(response.status, body?.error?.message ?? 'Request failed', body?.error?.code);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string, accessToken?: string) => request<T>(path, { method: 'GET', accessToken }),
  post: <T>(path: string, body?: unknown, accessToken?: string) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, accessToken }),
  put: <T>(path: string, body?: unknown, accessToken?: string) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, accessToken }),
  delete: <T>(path: string, accessToken?: string) => request<T>(path, { method: 'DELETE', accessToken }),
};
