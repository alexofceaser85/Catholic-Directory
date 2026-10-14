// Basic browser security headers (a lightweight stand-in for the helmet package).
// The Content-Security-Policy only allows our own files plus Google's sign-in script.
const GOOGLE_SIGN_IN = 'https://accounts.google.com/gsi/';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' ${GOOGLE_SIGN_IN}client`,
  // Google's sign-in script adds inline styles to its button. Styles can't run code,
  // and scripts stay locked to our own files plus Google's sign-in script.
  `style-src 'self' 'unsafe-inline' ${GOOGLE_SIGN_IN}style`,
  `frame-src ${GOOGLE_SIGN_IN}`,
  `connect-src 'self' ${GOOGLE_SIGN_IN}`,
  "img-src 'self' data: https://*.googleusercontent.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Lets the Google sign-in popup talk back to the admin page.
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  });
  next();
}
