// Removes the white/grey checkerboard baked into crucifix-source.png and shrinks it to
// logo size (crucifix.png). Runs in a headless browser, which does the image work.
// See docs/logo.md for the one-line Docker command.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const src = 'data:image/png;base64,' + readFileSync('/tmp/crucifix-src.png').toString('base64');
const browser = await chromium.launch();
const p = await browser.newPage();
const out = await p.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, W, H); const d = id.data;
  // Background = light, colorless pixels (the white/grey checkerboard).
  const isBg = (i) => { const r = d[i], g = d[i+1], b = d[i+2]; return Math.max(r,g,b) - Math.min(r,g,b) < 22 && Math.min(r,g,b) > 170; };
  // Group background-like pixels into connected patches. Clear the ones touching the edge,
  // and enclosed ones big enough to be checkerboard (small bright specks are gold highlights).
  const MIN_ENCLOSED = 250;
  // This checkerboard's squares are ~232-239 and ~248-255 bright. A gold highlight is
  // almost never above 248, so a patch needs plenty of both to count as background.
  const looksLikeCheckerboard = (patch) => {
    let white = 0, grey = 0;
    for (const k of patch) { const m = Math.min(d[k*4], d[k*4+1], d[k*4+2]); if (m >= 248) white++; else if (m < 240) grey++; }
    return white / patch.length > 0.2 && grey / patch.length > 0.2;
  };
  const seen = new Uint8Array(W * H);
  let cleared = 0;
  for (let start = 0; start < W * H; start++) {
    if (seen[start] || !isBg(start * 4)) continue;
    const patch = []; const stack = [start]; seen[start] = 1; let touchesEdge = false;
    while (stack.length) {
      const k = stack.pop(); patch.push(k);
      const x = k % W, y = (k - x) / W;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) touchesEdge = true;
      for (const n of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1]) {
        if (n >= 0 && !seen[n] && isBg(n * 4)) { seen[n] = 1; stack.push(n); }
      }
    }
    if (touchesEdge || (patch.length >= MIN_ENCLOSED && looksLikeCheckerboard(patch))) {
      for (const k of patch) d[k * 4 + 3] = 0;
      cleared += patch.length;
    }
  }
  // Soften the edge: opaque pixels touching cleared ones become half transparent.
  const alpha = new Uint8Array(W*H); for (let k = 0; k < W*H; k++) alpha[k] = d[k*4+3];
  for (let y = 1; y < H-1; y++) for (let x = 1; x < W-1; x++) {
    const k = y*W + x; if (!alpha[k]) continue;
    const n = (alpha[k-1]===0) + (alpha[k+1]===0) + (alpha[k-W]===0) + (alpha[k+W]===0);
    if (n) d[k*4+3] = n >= 2 ? 90 : 170;
  }
  ctx.putImageData(id, 0, 0);
  // Shrink to logo size.
  const h = 480, w = Math.round(W * h / H);
  const s = document.createElement('canvas'); s.width = w; s.height = h;
  const sctx = s.getContext('2d'); sctx.imageSmoothingQuality = 'high'; sctx.drawImage(c, 0, 0, w, h);
  return { cleared: (cleared / (W*H) * 100).toFixed(1), data: s.toDataURL('image/png') };
}, src);
console.log('background removed:', out.cleared + '% of pixels');
writeFileSync('/out/crucifix-cut.png', Buffer.from(out.data.split(',')[1], 'base64'));
await browser.close();
