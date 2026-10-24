(() => {
  if (!/^https?:$/.test(location.protocol) || !window.fetch || !window.AbortController) return;

  const siteBase = new URL('.', document.currentScript.src);
  const stateKey = 'portfolioNavigation';
  let renderedURL = location.href;
  let pending = null;
  let scrollFrame = null;

  const pageKey = url => `${url.origin}${url.pathname}${url.search}`;
  const isSitePage = url => url.origin === siteBase.origin
    && url.pathname.startsWith(siteBase.pathname)
    && (url.pathname.endsWith('/') || /\.html$/.test(url.pathname));

  // Keep the original head's assets valid when pushState changes the base URL.
  document.querySelectorAll('head link[href]').forEach(link => { link.href = link.href; });

  function resources(page, base) {
    const nodes = [...page.querySelectorAll('script, link[rel="stylesheet"]')].filter(node => {
      // Eleventy injects this client into full loads only. Keep the running client,
      // but exclude it when comparing a fetched page's application resources.
      if (node.matches('script[type="module"][src]')) {
        const src = new URL(node.getAttribute('src'), base);
        if (src.origin === siteBase.origin && src.pathname === '/.11ty/reload-client.js') return false;
      }
      return true;
    });
    return JSON.stringify(nodes.map(node => (
      node.tagName === 'SCRIPT'
        ? [node.tagName, node.getAttribute('src') ? new URL(node.getAttribute('src'), base).href : node.textContent,
          node.type, node.hasAttribute('defer'), node.hasAttribute('async')]
        : [node.tagName, new URL(node.getAttribute('href'), base).href, node.media]
    )));
  }

  const initialResources = resources(document, location.href);

  function saveScroll() {
    if (location.href !== renderedURL) return;
    history.replaceState({ ...history.state, [stateKey]: {
      url: renderedURL, x: window.scrollX, y: window.scrollY
    } }, '', renderedURL);
  }

  history.scrollRestoration = 'manual';
  saveScroll();
  window.addEventListener('scroll', () => {
    if (pending || scrollFrame !== null) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      if (!pending) saveScroll();
    });
  }, { passive: true });
  window.addEventListener('pagehide', saveScroll);

  function focusAndScroll(url, position) {
    let anchor;
    try {
      anchor = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
    } catch { /* Malformed fragments still allow navigation to the page. */ }
    const target = anchor || document.querySelector('main h1') || document.querySelector('main');
    if (target) {
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
      target.focus({ preventScroll: true });
    }
    if (position?.url === url.href) {
      window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
    } else if (anchor) {
      anchor.scrollIntoView({ behavior: 'instant' });
    } else {
      window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    }
  }

  async function navigate(url, { traversal = false, position } = {}) {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    document.documentElement.setAttribute('aria-busy', 'true');
    try {
      let page;
      let shell;
      if (pageKey(url) !== pageKey(new URL(renderedURL))) {
        const response = await fetch(url.href, {
          signal: controller.signal,
          headers: { Accept: 'text/html' }
        });
        if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
          throw new Error('Not a site page');
        }
        const destination = new URL(response.url);
        destination.hash = url.hash;
        if (!isSitePage(destination)) throw new Error('Destination outside this site');
        url = destination;
        page = new DOMParser().parseFromString(await response.text(), 'text/html');
        shell = page.querySelector('.site-shell');
        // Pages with different scripts/styles need a normal load to initialize them.
        if (!shell?.querySelector('main') || shell.querySelector('script')
          || page.querySelector('base') || resources(page, url) !== initialResources) {
          throw new Error('Page requires a full load');
        }
      }
      if (controller.signal.aborted) return;
      if (!traversal) {
        saveScroll();
        if (url.href !== location.href) history.pushState({}, '', url.href);
      } else if (url.href !== location.href) {
        history.replaceState(history.state, '', url.href);
      }

      if (page) {
        document.title = page.title;
        for (const name of ['description', 'post-tags']) {
          document.querySelector(`meta[name="${name}"]`)?.remove();
          const meta = page.querySelector(`meta[name="${name}"]`);
          if (meta) document.head.append(document.importNode(meta, true));
        }
        document.documentElement.lang = page.documentElement.lang;
        document.body.className = page.body.className;
        document.body.id = page.body.id;
        document.querySelector('.site-shell').replaceWith(document.importNode(shell, true));
        document.dispatchEvent(new Event('site:navigated'));
      }
      renderedURL = url.href;
      // Wait for the new layout before restoring a history entry's scroll position.
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (controller.signal.aborted) return;
      focusAndScroll(url, position);
      saveScroll();
    } catch (error) {
      if (controller.signal.aborted) return;
      if (traversal) location.replace(url.href);
      else location.assign(url.href);
    } finally {
      if (pending === controller) {
        pending = null;
        document.documentElement.removeAttribute('aria-busy');
      }
    }
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || link.hasAttribute('data-no-spa')
      || (link.target && link.target !== '_self') || link.relList.contains('external')) return;
    const url = new URL(link.href);
    if (!isSitePage(url)) return;
    event.preventDefault();
    navigate(url);
  });

  window.addEventListener('popstate', event => {
    const url = new URL(location.href);
    if (!isSitePage(url)) {
      location.reload();
      return;
    }
    navigate(url, { traversal: true, position: event.state?.[stateKey] });
  });
})();
