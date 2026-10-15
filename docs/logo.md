# The logo

`public/img/logo.svg` is both the header logo and the browser-tab icon:

- **Drawn shapes:** the green circle (`#1f6b3a`, the green of Ordinary Time vestments), the
  gold ring, and a hammer (the trades) and sickle (the harvest) crossed behind the foot of the
  cross. The tools are flat gold silhouettes (`#e3b955`, the ring's color) with no shading,
  so they stay simple next to the photo. Edit them as SVG; the crucifix is drawn on top.
- **Embedded picture:** the gilded crucifix in the middle, stored inside the SVG as a PNG.
  Browsers don't load separate image files from inside an SVG used as a logo, so it has to
  be embedded.

The crucifix picture was supplied by the site owner. Make sure you have the right to use
any image you put here on a public website.

## Replacing the crucifix picture

Files in `tools/logo/`:

| File | What it is |
|---|---|
| `crucifix-source.png` | The original picture |
| `cutout.mjs` | Removes a white/grey checkerboard "fake transparent" background and shrinks the picture to 480 px tall |
| `crucifix.png` | The result, ready to embed |
| `embed.py` | Puts `crucifix.png` inside `public/img/logo.svg` |

1. Save the new picture as `tools/logo/crucifix-source.png`.
2. If it has a checkerboard baked in (many "free PNG" sites do this), run the cutout. It
   needs Docker and runs in a headless browser:

   ```bash
   docker run --rm -v "$PWD/tools/logo":/work -w /tmp mcr.microsoft.com/playwright:v1.56.1-noble \
     sh -c "npm i -s playwright@1.56.1 >/dev/null && cp /work/crucifix-source.png /tmp/crucifix-src.png && mkdir -p /out \
            && node /work/cutout.mjs && cp /out/crucifix-cut.png /work/crucifix.png"
   ```

   If the picture already has a real transparent background, just shrink it to about
   480 px tall and save it as `tools/logo/crucifix.png`.
3. `python3 tools/logo/embed.py`
4. Check it: open the site and look at the header and the browser tab. If the new picture
   has a different shape, adjust the `<image>` tag's `x`, `width` and `height` at the end of
   `logo.svg` (the circle is 64 × 64 units).
