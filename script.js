(() => {
  const key = 'seth-portfolio-theme';
  const root = document.documentElement;

  const siteBase = new URL('.', document.currentScript.src);
  const systemTheme = window.matchMedia('(prefers-color-scheme: light)');
  let preference = null;
  const themeStores = ['localStorage', 'sessionStorage'];

  function readTheme() {
    while (themeStores.length) {
      try {
        const saved = window[themeStores[0]].getItem(key);
        return saved === 'light' || saved === 'dark' ? saved : null;
      } catch {
        themeStores.shift();
      }
    }
    return null;
  }

  function saveTheme(theme) {
    while (themeStores.length) {
      try {
        window[themeStores[0]].setItem(key, theme);
        return;
      } catch {
        themeStores.shift();
      }
    }
  }

  preference = readTheme();

  function applyTheme(theme) {
    root.dataset.theme = theme;
    const button = document.querySelector('.theme-toggle');
    if (button) {
      const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
      button.setAttribute('aria-label', label);
      button.title = themeStores.length ? label : `${label} (for this page only)`;
    }
  }

  applyTheme(preference || (systemTheme.matches ? 'light' : 'dark'));

  document.addEventListener('DOMContentLoaded', () => {
    renderPosts();
    const articleHeader = document.querySelector('article .article-header');
    if (articleHeader) articleHeader.append(createTags(readTags(document)));
    const button = document.querySelector('.theme-toggle');
    if (!button) return;
    button.hidden = false;
    applyTheme(root.dataset.theme);
    button.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      saveTheme(preference);
      applyTheme(preference);
    });
  });

  function readTags(page) {
    const tags = page.querySelector('meta[name="post-tags"]')?.content || '';
    return [...new Set(tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean))];
  }

  function createTags(tags) {
    const group = document.createElement('div');
    group.className = 'post-tags';
    tags.forEach(tag => {
      const label = document.createElement('span');
      label.className = 'post-tag';
      label.textContent = tag;
      group.append(label);
    });
    return group;
  }

  async function setupFilters(list, posts) {
    const filters = document.querySelector('[data-tag-filters]');
    const status = document.querySelector('[data-filter-status]');
    if (!filters || !status || !posts.length) return;
    filters.replaceChildren();
    filters.hidden = true;
    status.textContent = 'Loading tags…';
    let failures = 0;
    const taggedPosts = await Promise.all(posts.map(async post => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(new URL(post.url, siteBase), { signal: controller.signal });
        if (!response.ok) throw new Error('Post unavailable');
        const page = new DOMParser().parseFromString(await response.text(), 'text/html');
        return { ...post, tags: readTags(page) };
      } catch {
        failures += 1;
        return { ...post, tags: [] };
      } finally {
        clearTimeout(timeout);
      }
    }));
    const tags = [...new Set(taggedPosts.flatMap(post => post.tags))].sort();
    const buttons = [];
    function selectTag(tag) {
      const matching = taggedPosts.filter(post => tag === null || post.tags.includes(tag));
      renderPostList(list, matching);
      buttons.forEach(item => item.button.setAttribute('aria-pressed', String(item.tag === tag)));
      status.textContent = `${matching.length} ${matching.length === 1 ? 'post' : 'posts'}${tag === null ? '' : ` tagged “${tag}”`}.`;
      if (failures) {
        status.append(' Some tags could not be loaded. You can still browse all posts. ');
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'filter-retry';
        retry.textContent = 'Retry loading tags';
        retry.addEventListener('click', () => {
          renderPostList(list, taggedPosts);
          setupFilters(list, posts);
        });
        status.append(retry);
      }
    }
    [null, ...tags].forEach(tag => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tag-filter';
      const label = document.createElement('span');
      label.textContent = tag === null ? 'All posts' : tag;
      const brackets = ['[', ']'].map(character => {
        const bracket = document.createElement('span');
        bracket.className = 'tag-bracket';
        bracket.textContent = character;
        bracket.setAttribute('aria-hidden', 'true');
        return bracket;
      });
      const count = document.createElement('span');
      count.className = 'tag-count';
      count.textContent = String(tag === null ? taggedPosts.length : taggedPosts.filter(post => post.tags.includes(tag)).length);
      count.setAttribute('aria-hidden', 'true');
      button.append(brackets[0], label, count, brackets[1]);
      button.addEventListener('click', () => selectTag(tag));
      buttons.push({ tag, button });
      filters.append(button);
    });
    filters.hidden = tags.length === 0;
    selectTag(null);
  }

  function renderPosts() {
    const posts = (typeof POSTS === 'undefined' ? [] : POSTS)
      .filter(post => !post.draft)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));

    document.querySelectorAll('[data-post-list]').forEach(list => {
      renderPostList(list, posts);
      if (list.hasAttribute('data-filterable')) setupFilters(list, posts);
    });
  }

  function renderPostList(list, posts) {
    const limit = Number(list.dataset.limit) || posts.length;
    list.replaceChildren();
    if (!posts.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Notes are on the way. Check back soon.';
      list.append(empty);
      return;
    }
    posts.slice(0, limit).forEach(post => {
      const link = document.createElement('a');
      link.className = 'post-link';
      link.href = new URL(post.url, siteBase).href;
      const content = document.createElement('div');
      const metadata = document.createElement('p');
      metadata.className = 'entry-date';
      if (post.sample) metadata.append('Sample post · ');
      const date = document.createElement('time');
      date.dateTime = post.date;
      date.textContent = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
      }).format(new Date(`${post.date}T00:00:00Z`));
      metadata.append(date);
      const title = document.createElement('h3');
      title.textContent = post.title;
      const excerpt = document.createElement('p');
      excerpt.textContent = post.excerpt;
      const arrow = document.createElement('span');
      arrow.className = 'link-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      content.append(metadata, title, excerpt);
      if (post.tags?.length) content.append(createTags(post.tags));
      link.append(content, arrow);
      list.append(link);
    });
  }

  systemTheme.addEventListener('change', () => {
    if (!preference) applyTheme(systemTheme.matches ? 'light' : 'dark');
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    if (themeStores[0] !== 'localStorage') return;
    preference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : null;
    applyTheme(preference || (systemTheme.matches ? 'light' : 'dark'));
  });
})();
