// Verifies the "Sign in with Google" credential sent by the admin page.
// Google signs the credential (a JWT); this checks the signature, that it was
// issued for our client ID, and that the email address is verified.
import { OAuth2Client } from 'google-auth-library';
import config from '../config.js';
import { HttpError } from '../lib/httpError.js';

const client = new OAuth2Client();

/** @returns {Promise<string>} The verified, lower-cased Google account email. */
export async function verifyGoogleCredential(credential) {
  if (!config.googleClientId) {
    throw new HttpError(503, 'Google sign-in is not configured (GOOGLE_CLIENT_ID is empty).');
  }
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: config.googleClientId });
    const { email, email_verified: emailVerified } = ticket.getPayload();
    if (!email || !emailVerified) throw new Error('Email not verified');
    return email.toLowerCase();
  } catch {
    throw new HttpError(401, 'Google sign-in failed. Please try again.');
  }
}
