/**
 * Site-wide data. Referenced as `site.*` in every template.
 *
 * Kept deliberately small: it holds only things that are true today. The
 * privacy receipt (`site.audit`) that the footer will one day show is NOT here
 * yet — it returns when CI writes it for real, not as a hand-typed number.
 */
export default {
  title: "f/11",
  url: "https://thef11.com",
  description:
    "A photo blog by a developer who is also building crustyimg, a Rust image CLI.",

  // Primary navigation. The wordmark handles Home; these are the rest.
  nav: [
    { label: "Topics", url: "/topics/" },
    { label: "About", url: "/about/" },
  ],

  // Real, existing repositories only. `eleventy-plugin-crustyimg` does not have
  // its own repo yet — it is developed inside this site. When it is extracted,
  // add `plugin:` here and the header link (guarded by {% if %}) lights up.
  repos: {
    crustyimg: "https://github.com/jysf/crustyimg",
  },
};
