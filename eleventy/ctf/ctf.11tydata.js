module.exports = {
  ...require('../posts/posts.11tydata.js'),
  eleventyComputed: {
    topics: data => [...new Set(['ctf', ...(data.topics || [])])]
  }
};
