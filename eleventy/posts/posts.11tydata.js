module.exports = {
  layout: 'post.njk',
  tags: ['markdownPosts'],
  permalink: data => `/blog/${data.page.fileSlug}.html`
};
