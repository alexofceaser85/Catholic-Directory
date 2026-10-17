// A row of a post's photos as thumbnails. Each opens the full-size photo in a new tab.
import { el } from './dom.js';
import { photoUrl } from './photo-rules.js';

/** @returns {HTMLElement|null} null when there are no photos. */
export function renderPhotoStrip(keys, title) {
  if (!keys || keys.length === 0) return null;
  return el('ul', { class: 'photo-strip' }, keys.map((key, index) =>
    el('li', {}, [
      el('a', { href: photoUrl(key), target: '_blank', rel: 'noopener' }, [
        el('img', { src: photoUrl(key), alt: `${title}, photo ${index + 1}`, loading: 'lazy' }),
      ]),
    ])));
}
