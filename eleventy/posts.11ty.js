module.exports = class {
  data() {
    return { permalink: '/posts.js', eleventyExcludeFromCollections: true };
  }

  render({ collections }) {
    const markdown = (collections.markdownPosts || [])
      .filter(post => !post.data.draft)
      .map(post => ({
        title: post.data.title,
        date: post.date.toISOString().slice(0, 10),
        excerpt: post.data.description,
        url: post.url.replace(/^\//, ''),
        sample: Boolean(post.data.sample)
      }));
    return `const POSTS = ${JSON.stringify(markdown, null, 2)};\n`;
  }
};
