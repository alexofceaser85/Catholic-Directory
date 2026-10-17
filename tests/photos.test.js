import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { processPhoto, createPhotoKey, isPhotoKey } from '../server/lib/photos.js';
import { validatePosterEdit, validateSubmission } from '../server/validation/listingValidation.js';
import { MAX_PHOTO_SIDE, MAX_PHOTOS } from '../public/js/photo-rules.js';

/** A plain JPEG with GPS coordinates in its EXIF, like a phone photo. */
function phonePhoto(width, height) {
  return sharp({ create: { width, height, channels: 3, background: '#4a7' } })
    .jpeg()
    .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '33/1 45/1 0/1' } })
    .toBuffer();
}

const basePost = {
  title: 'Sweetwater Creek Farm',
  category: 'Farm & livestock',
  email: 'hello@sweetwater.example',
  description: 'Eggs and vegetables.',
};

function fieldErrors(fn) {
  try {
    fn();
  } catch (error) {
    assert.equal(error.status, 400);
    return error.details.fields;
  }
  assert.fail('Expected a validation error');
}

test('photos are shrunk, re-encoded as WebP, and lose their location data', async () => {
  const original = await phonePhoto(3000, 2000);
  assert.ok((await sharp(original).metadata()).exif, 'test photo starts with EXIF');

  const { image, width, height } = await processPhoto(original);
  const result = await sharp(image).metadata();
  assert.equal(result.format, 'webp');
  assert.equal(result.exif, undefined);
  assert.deepEqual([width, height], [MAX_PHOTO_SIDE, Math.round(MAX_PHOTO_SIDE / 1.5)]);
});

test('small photos are not enlarged', async () => {
  const { width, height } = await processPhoto(await phonePhoto(400, 300));
  assert.deepEqual([width, height], [400, 300]);
});

test('anything that is not a JPEG, PNG or WebP photo is refused', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
  for (const upload of [Buffer.from('not an image'), svg]) {
    await assert.rejects(processPhoto(upload), (error) => error.status === 400 && 'photos' in error.details.fields);
  }
});

test('photo keys are random 32-character hex ids', () => {
  const key = createPhotoKey();
  assert.ok(isPhotoKey(key));
  assert.notEqual(key, createPhotoKey());
  for (const bad of ['', '../etc/passwd', key.toUpperCase(), `${key}0`, 42]) assert.equal(isPhotoKey(bad), false);
});

test('a form without photos leaves the photos alone', () => {
  assert.equal('photos' in validatePosterEdit(basePost), false);
});

test('photo entries are decoded: kept keys and new uploads, in order', () => {
  const key = createPhotoKey();
  const { photos } = validatePosterEdit({ ...basePost, photos: [{ upload: Buffer.from('abc').toString('base64') }, { keep: key }] });
  assert.deepEqual(photos, [{ upload: Buffer.from('abc') }, { keep: key }]);
});

test('new posts can only upload, not point at saved photos', () => {
  const submission = {
    ...basePost, postType: 'Business', submitterFirstName: 'A', submitterLastName: 'B', consent: true,
    photos: [{ keep: createPhotoKey() }],
  };
  assert.ok(fieldErrors(() => validateSubmission(submission)).photos);
});

test('too many photos, or malformed ones, are refused', () => {
  const upload = { upload: 'YWJj' };
  assert.ok(fieldErrors(() => validatePosterEdit({ ...basePost, photos: Array(MAX_PHOTOS + 1).fill(upload) })).photos);
  for (const photos of ['YWJj', [{}], [{ keep: 'nope' }], [{ upload: '' }]]) {
    assert.ok(fieldErrors(() => validatePosterEdit({ ...basePost, photos })).photos, JSON.stringify(photos));
  }
});
