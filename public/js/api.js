// Thin wrapper around fetch() for talking to the server's JSON API.

/** Error thrown for any non-2xx response. `fields` holds per-field validation messages. */
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status}).`);
    this.status = status;
    this.fields = body?.fields || {};
  }
}

async function request(method, path, body) {
  const options = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(path, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
};
