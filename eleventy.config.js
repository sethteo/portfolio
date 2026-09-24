module.exports = function (eleventyConfig) {
  for (const file of ['index.html', 'styles.css', 'script.js', 'favicon.svg', '.nojekyll', 'blog/index.html']) {
    eleventyConfig.addPassthroughCopy(file);
  }
  eleventyConfig.addFilter('isoDate', date => date.toISOString().slice(0, 10));
  eleventyConfig.addFilter('readableDate', date => new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(date));
  return {
    dir: { input: 'eleventy', output: '_site' },
    templateFormats: ['md', 'njk', '11ty.js'],
    markdownTemplateEngine: false
  };
};
