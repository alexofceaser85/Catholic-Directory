// The "Photos" field on the submit, manage and admin edit forms.
// Photos are shrunk in the browser before they're sent, so uploads stay quick on a phone
// connection. The server then checks and re-encodes them again (server/lib/photos.js).
import { el } from './dom.js';
import { MAX_PHOTOS, MAX_PHOTO_SIDE, photoUrl } from './photo-rules.js';

const JPEG_QUALITY = 0.85;

/** Decodes an image file and redraws it no bigger than MAX_PHOTO_SIDE. Returns a JPEG data URL. */
async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = el('canvas', { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

let pickerCount = 0;

/**
 * Builds the picker inside `container`.
 * @returns {{ setPhotos: (keys: string[]) => void, entries: () => Promise<object[]> }}
 *   setPhotos - show a post's saved photos (by key)
 *   entries   - the photos to send: { keep: key } for saved ones, { upload: base64 } for new ones
 */
export function createPhotoPicker(container) {
  const inputId = `photo-input-${++pickerCount}`;
  let photos = []; // { key } for saved photos, { dataUrl } for new ones
  let shrinking = Promise.resolve();

  const grid = el('ul', { class: 'photo-grid' });
  const input = el('input', { type: 'file', id: inputId, class: 'visually-hidden', accept: 'image/*', multiple: true });
  const addButton = el('label', { class: 'button secondary small photo-add', for: inputId }, ['Add photos']);
  const count = el('span', { class: 'muted small', 'aria-live': 'polite' });
  const problem = el('p', { class: 'field-error', role: 'alert' });

  function removeAt(index) {
    photos.splice(index, 1);
    render();
  }

  function tile(photo, index) {
    return el('li', { class: 'photo-tile' }, [
      el('img', { src: photo.key ? photoUrl(photo.key) : photo.dataUrl, alt: `Photo ${index + 1}` }),
      el('button', { type: 'button', class: 'photo-remove', 'aria-label': `Remove photo ${index + 1}`, onclick: () => removeAt(index) }, ['×']),
    ]);
  }

  function render() {
    grid.replaceChildren(...photos.map(tile));
    grid.hidden = photos.length === 0;
    addButton.hidden = photos.length >= MAX_PHOTOS;
    count.textContent = `${photos.length} of ${MAX_PHOTOS}`;
  }

  async function addFiles(files) {
    const unreadable = [];
    for (const file of files.slice(0, MAX_PHOTOS - photos.length)) {
      try {
        photos.push({ dataUrl: await shrinkPhoto(file) });
      } catch {
        unreadable.push(file.name);
      }
    }
    problem.textContent = unreadable.length
      ? `Couldn't read ${unreadable.join(', ')}. Please choose a JPEG or PNG photo.`
      : '';
    render();
  }

  input.addEventListener('change', () => {
    const files = [...input.files];
    input.value = ''; // so choosing the same file again still fires "change"
    shrinking = shrinking.then(() => addFiles(files));
  });

  container.replaceChildren(grid, el('div', { class: 'photo-controls' }, [input, addButton, count]), problem);
  render();

  return {
    setPhotos(keys) {
      photos = keys.map((key) => ({ key }));
      problem.textContent = '';
      render();
    },
    async entries() {
      await shrinking; // wait for photos that are still being shrunk
      return photos.map((photo) => (photo.key ? { keep: photo.key } : { upload: photo.dataUrl.split(',')[1] }));
    },
  };
}
