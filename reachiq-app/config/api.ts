export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

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

  const response = await fetch(`${API_URL}/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

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
