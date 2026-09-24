module.exports = function withTableOfContents(content, enabled) {
  if (!enabled) return content;

  const headings = [...content.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi)];
  if (headings.length < 3) return content;

  const usedIds = new Set([...content.matchAll(/\bid="([^"]*)"/g)].map(match => match[1]));
  const links = [];
  let section = 0;
  const article = content.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi, (heading, attributes, title) => {
    let id = /\bid="([^"]*)"/.exec(attributes)?.[1];
    if (!id) {
      do { id = `post-section-${++section}`; } while (usedIds.has(id));
      usedIds.add(id);
      heading = `<h2 id="${id}"${attributes}>${title}</h2>`;
    }
    const label = title.replace(/<[^>]*>/g, '');
    links.push(`<li><a href="#${id}">${label}</a></li>`);
    return heading;
  });

  const navigation = `<nav class="post-toc" aria-label="On this page"><p class="eyebrow">On this page</p><ul>${links.join('')}</ul></nav>\n`;
  return article.replace(/<h2\b/i, `${navigation}<h2`);
};
