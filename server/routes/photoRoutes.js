// Serves uploaded photos: GET /photos/<key>.webp. Mounted at /photos.
// The key is random, so a photo's address can't be guessed. Only the public listing
// (or, before review, the poster's page and the admin dashboard) hands it out.
import { Router } from 'express';
import * as photos from '../repositories/photoRepository.js';
import { isPhotoKey } from '../lib/photos.js';

const ONE_DAY_IN_SECONDS = 24 * 60 * 60;

const router = Router();

router.get('/:file', async (req, res) => {
  const key = req.params.file.replace(/\.webp$/, '');
  const photo = isPhotoKey(key) ? await photos.findImageByKey(key) : null;
  if (!photo) {
    res.status(404).end();
    return;
  }
  // A photo never changes once saved (a new photo gets a new key), so browsers may keep it a while.
  res.set({ 'Content-Type': 'image/webp', 'Cache-Control': `public, max-age=${ONE_DAY_IN_SECONDS}` });
  res.send(photo.image);
});

export default router;
