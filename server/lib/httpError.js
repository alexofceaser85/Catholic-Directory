// An error that carries an HTTP status code. Throw it from anywhere in a request;
// the error handler middleware turns it into a JSON response.
export class HttpError extends Error {
  /**
   * @param {number} status  HTTP status code, e.g. 400 or 404.
   * @param {string} message Safe to show to the user.
   * @param {object} [details] Extra JSON fields, e.g. { fields: { email: 'Invalid email' } }.
   */
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (what = 'Listing') => new HttpError(404, `${what} not found.`);
