/**
 * f/11 — Eleventy configuration
 *
 * The key idea in this file is post-folder bundling: a post is a FOLDER
 * containing its own index.md and its own photographs. Eleventy turns
 *
 *     src/posts/2026-07-12-mission-morning/index.md
 *     src/posts/2026-07-12-mission-morning/dsc_0142.jpg
 *
 * into
 *
 *     _site/posts/2026-07-12-mission-morning/index.html   ← the page
 *     _site/posts/2026-07-12-mission-morning/dsc_0142.jpg ← the photo, copied
 *
 * so the page lives at /posts/2026-07-12-mission-morning/ and its photo sits
 * right beside it. That is why the {% image %} shortcode can take a bare
 * filename: the image is always a sibling of the post that references it.
 *
 * Adding a post is therefore: make a folder, drop photos in, write index.md.
 * No central image directory, no filename collisions, no orphaned files when
 * a post is deleted.
 */

import { RenderPlugin } from "@11ty/eleventy";
import rssPlugin from "@11ty/eleventy-plugin-rss";
import imageShortcode from "./src/_shortcodes/image.js";
import iconShortcode from "./src/_shortcodes/icon.js";

export default function (eleventyConfig) {
  /* ---- the image seam ------------------------------------------------ */
  eleventyConfig.addPlugin(imageShortcode);

  /* ---- {% icon %}: inline Lucide SVGs at build time, no client JS ----- */
  eleventyConfig.addPlugin(iconShortcode);

  /* ---- passthrough: photos ride along with their posts ---------------
   * Preserves the directory structure relative to the input dir, which is
   * exactly what post-folder bundling needs. Note HEIC is included: the
   * browser can't display it, but copying it is harmless today and this is
   * the list crustyimg will take over.
   */
  eleventyConfig.addPassthroughCopy("src/posts/**/*.{jpg,jpeg,png,webp,avif,gif}");
  eleventyConfig.addPassthroughCopy("src/assets");

  /* ---- the custom domain: CNAME rides into _site/ untouched ---------- */
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });

  /* ---- plugins ------------------------------------------------------- */
  eleventyConfig.addPlugin(rssPlugin);
  eleventyConfig.addPlugin(RenderPlugin);

  /* ---- filters ------------------------------------------------------- */
  eleventyConfig.addFilter("readableDate", (d) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }).format(d)
  );

  eleventyConfig.addFilter("isoDate", (d) => d.toISOString());

  /* ---- collections ---------------------------------------------------
   * `posts` is everything, newest first — this is a blog right now, not an
   * ordered guide. A featured post is just a flag in front matter; the home
   * page pulls it out and renders it large.
   */
  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("src/posts/**/index.md").reverse()
  );

  eleventyConfig.addCollection("featured", (api) =>
    api.getFilteredByGlob("src/posts/**/index.md").filter((p) => p.data.featured).reverse()
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
