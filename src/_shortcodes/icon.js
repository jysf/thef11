/**
 * {% icon "name" %} — inline a Lucide SVG at build time.
 *
 * Zero client JS, zero network. The raw <svg> is read from the installed
 * lucide-static package and dropped straight into the HTML. Icons inherit the
 * current text colour (Lucide already sets stroke="currentColor") and size from
 * font-size or an explicit class.
 *
 * Decorative by default (aria-hidden) — pair a visible text label with it.
 * Pass a second argument to add a class for sizing/colour hooks:
 *
 *   {% icon "rss" %}
 *   {% icon "arrow-up-right", "icon--sm" %}
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
// Resolve the installed package so the icon path survives npm hoisting.
const ICON_DIR = path.join(
  path.dirname(require.resolve("lucide-static/package.json")),
  "icons"
);

export default function iconShortcode(eleventyConfig) {
  eleventyConfig.addShortcode("icon", function (name, className = "") {
    const file = path.join(ICON_DIR, `${name}.svg`);
    if (!fs.existsSync(file)) {
      // Fail the build: a missing icon is a typo, and a silent empty span
      // would be found only by someone staring at the rendered page.
      throw new Error(
        `Unknown icon "${name}" — not found in lucide-static/icons/. ` +
        `Referenced by ${this.page.inputPath}.`
      );
    }
    return fs
      .readFileSync(file, "utf8")
      .replace(/<!--[\s\S]*?-->/g, "") // drop the license comment
      .trim()
      .replace(/\s+class="lucide[^"]*"/, "") // drop Lucide's own class
      .replace(
        /<svg\b/, // add a11y attrs (+ optional class) to the opening tag
        `<svg aria-hidden="true" focusable="false"${
          className ? ` class="${className}"` : ""
        }`
      );
  });
}
