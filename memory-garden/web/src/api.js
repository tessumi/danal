import { getToken, clearToken } from './auth.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  if (auth) {
    const token = getToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401) {
    clearToken();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'request_failed');
    error.payload = data;
    throw error;
  }
  return data;
}

export { API_URL };
