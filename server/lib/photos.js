// Turns an uploaded photo into the version we store and serve.
// Every upload is decoded and re-encoded with sharp, which:
//   - rejects anything that isn't really a JPEG, PNG or WebP photo,
//   - turns it upright and shrinks it to MAX_PHOTO_SIDE,
//   - drops all metadata, including the GPS location phones add (a farm's photo
//     could otherwise give away the family's home address).
import crypto from 'node:crypto';
import sharp from 'sharp';
import { HttpError } from './httpError.js';
import { MAX_PHOTO_SIDE } from '../../public/js/photo-rules.js';

const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp'];

// Refuses "decompression bombs": tiny files that claim to be enormous images.
const MAX_INPUT_PIXELS = 50_000_000;

const KEY_PATTERN = /^[0-9a-f]{32}$/;

function unreadable() {
  const message = "One of the photos couldn't be read. Please use a JPEG or PNG photo.";
  return new HttpError(400, message, { fields: { photos: message } });
}

/** A new random photo id. It's part of the photo's address, so it can't be guessed. */
export function createPhotoKey() {
  return crypto.randomBytes(16).toString('hex');
}

export function isPhotoKey(value) {
  return typeof value === 'string' && KEY_PATTERN.test(value);
}

/**
 * @param {Buffer} upload  The raw uploaded file.
 * @returns {Promise<{ image: Buffer, width: number, height: number }>}  A metadata-free WebP.
 */
export async function processPhoto(upload) {
  try {
    const input = sharp(upload, { limitInputPixels: MAX_INPUT_PIXELS });
    const { format } = await input.metadata();
    if (!ACCEPTED_FORMATS.includes(format)) throw unreadable();

    const { data, info } = await input
      .rotate() // upright, using the camera's orientation tag
      .resize({ width: MAX_PHOTO_SIDE, height: MAX_PHOTO_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return { image: data, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unreadable();
  }
}
