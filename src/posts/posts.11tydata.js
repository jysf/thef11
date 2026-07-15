/**
 * Directory data for every post under src/posts/.
 *
 * Topics ARE tags. Authors write `tags:` in front matter (which drives the tag
 * collections, the /topics/ pages, and the per-tag feeds); the layouts display
 * `topics`. This keeps them from drifting: `topics` is simply a mirror of
 * `tags`, computed, so there is only ever one list to maintain.
 */
export default {
  eleventyComputed: {
    topics: (data) => data.tags || [],
  },
};
