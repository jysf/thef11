/**
 * ============================================================
 *  THE SEAM
 * ============================================================
 *
 * This is the single join point where the crustyimg pipeline will slot in.
 * Nothing else in the site knows how images are made. Every image on f/11
 * goes through this shortcode — even now, when it barely does anything.
 * That is the entire point: the markdown you write today keeps working
 * unchanged when the pipeline lands.
 *
 * TODAY (phase 0): emits a plain <img>, pointing at the file sitting next to
 * the post's index.md. Reads intrinsic dimensions from the file header so the
 * browser reserves space (no layout shift) without pulling in a dependency.
 *
 * LATER (phase 2): this same function shells out to crustyimg, generates
 * AVIF/WebP/JPEG derivatives at several widths, and returns a <picture> with
 * srcsets and a dominant-colour placeholder. The call sites do not change.
 *
 * Usage from markdown, where "dsc_0142.jpg" lives in the post's own folder:
 *
 *   {% image "dsc_0142.jpg", "Bicycle against a garage door" %}
 *   {% image "dsc_0147.jpg", "Fog over the rooftops", "bleed" %}
 *
 * The third argument is an optional CSS class — "bleed" makes an essay image
 * break out to the full viewport width (see .essay > .bleed in style.css).
 */

import fs from "node:fs";
import path from "node:path";

/* ------------------------------------------------------------------
 * Intrinsic dimensions, without a dependency.
 *
 * We only need width/height so the browser can reserve the right box before
 * the bytes arrive. Both JPEG and PNG state their dimensions in the first
 * few hundred bytes, so we read the header rather than decode the image.
 * When crustyimg lands it will hand us dimensions directly and this goes away.
 * ------------------------------------------------------------------ */
function readDimensions(file) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(65535);
    const bytes = fs.readSync(fd, buf, 0, buf.length, 0);

    // --- PNG: IHDR is always at a fixed offset ---
    if (buf.readUInt32BE(0) === 0x89504e47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }

    // --- JPEG: walk the marker segments until a Start-Of-Frame ---
    if (buf.readUInt16BE(0) === 0xffd8) {
      let off = 2;
      while (off < bytes - 9) {
        if (buf[off] !== 0xff) { off++; continue; }
        const marker = buf[off + 1];
        const len = buf.readUInt16BE(off + 2);
        // SOF0..SOF15, skipping the non-frame markers in that range
        const isSOF =
          marker >= 0xc0 && marker <= 0xcf &&
          marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSOF) {
          return {
            height: buf.readUInt16BE(off + 5),
            width: buf.readUInt16BE(off + 7),
          };
        }
        off += 2 + len;
      }
    }
  } catch {
    /* fall through — an unreadable header is not worth failing a build over */
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  return null; // unknown format (HEIC, etc.) — omit width/height rather than lie
}

/* ------------------------------------------------------------------ */

export default function imageShortcode(eleventyConfig) {
  /**
   * `function`, not an arrow — Eleventy binds `this` so we can reach
   * `this.page`, which tells us which post is calling us and therefore
   * which folder the image lives in.
   */
  eleventyConfig.addShortcode("image", function (src, alt, className = "") {
    // Alt text is not optional. Failing the build is the only reliable way to
    // keep it that way — a warning would be ignored by the fiftieth gallery post.
    if (alt === undefined) {
      throw new Error(
        `Missing alt text for image "${src}" in ${this.page.inputPath}. ` +
        `Every image needs one: {% image "file.jpg", "what it shows" %}`
      );
    }

    // The post lives at src/posts/<slug>/index.md, so its images are siblings
    // of the markdown file. Resolve against the input path on disk...
    const postDir = path.dirname(this.page.inputPath);
    const onDisk = path.join(postDir, src);

    // ...and against the page's URL for the browser. Because the post renders
    // to /posts/<slug>/ and passthrough copy preserves the folder structure,
    // the image sits at /posts/<slug>/<src>.
    const url = path.posix.join(this.page.url, src);

    if (!fs.existsSync(onDisk)) {
      throw new Error(
        `Image not found: ${src}\n  expected at: ${onDisk}\n  ` +
        `referenced by: ${this.page.inputPath}`
      );
    }

    const dim = readDimensions(onDisk);
    const size = dim ? ` width="${dim.width}" height="${dim.height}"` : "";
    const cls = className ? ` class="${className}"` : "";

    // A <figure> so essays can caption and bleed; the alt carries the meaning.
    return [
      `<figure${cls}>`,
      `<img src="${url}" alt="${escapeAttr(alt)}"${size} loading="lazy" decoding="async">`,
      `</figure>`,
    ].join("");
  });
}

function escapeAttr(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}
