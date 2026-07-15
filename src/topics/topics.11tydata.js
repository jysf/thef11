/**
 * Directory data for the /topics/ pages. Gives each generated tag page a
 * document title of "Topic: <tag>" (the tag comes from the pagination alias),
 * while the topics index keeps its own front-matter title.
 */
export default {
  eleventyComputed: {
    title: (data) => (data.tag ? `Topic: ${data.tag}` : data.title),
  },
};
