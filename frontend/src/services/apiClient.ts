const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function apiGet<TResponse>(path: string, token?: string | null): Promise<TResponse> {
  return apiRequest<TResponse>(path, { token });
}

export async function apiPost<TResponse>(
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'POST', body, token });
}

export function apiPut<TResponse>(path: string, body: unknown, token?: string | null) {
  return apiRequest<TResponse>(path, { method: 'PUT', body, token });
}

export function apiPatch<TResponse>(path: string, body: unknown, token?: string | null) {
  return apiRequest<TResponse>(path, { method: 'PATCH', body, token });
}

export function apiDelete<TResponse>(path: string, token?: string | null) {
  return apiRequest<TResponse>(path, { method: 'DELETE', token });
}
