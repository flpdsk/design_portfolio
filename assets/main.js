(() => {
  'use strict';
  const projects = window.PORTFOLIO_PROJECTS || [];
  const root = document.body.dataset.root || '';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const viewer = document.getElementById('viewer');
  const viewerImage = document.getElementById('viewer-image');
  const viewerDetails = document.getElementById('viewer-details');
  const viewerPrevious = document.getElementById('viewer-prev');
  const viewerNext = document.getElementById('viewer-next');
  let gallery = [];
  let activeImage = 0;
  let returnFocus;

  function workDetails(item) {
    const details = make('dl', 'work-details');
    [['Что делал', item.role], ['Авторство', item.team], ['Результат', item.status]].forEach(([label, value]) => {
      if (!value) return;
      const row = make('div');
      row.append(make('dt', '', label), make('dd', '', value));
      details.append(row);
    });
    return details;
  }
  function updateViewer(index) {
    activeImage = Math.max(0, Math.min(index, gallery.length - 1));
    const current = gallery[activeImage];
    viewerImage.src = current.src;
    viewerImage.alt = current.alt;
    document.getElementById('viewer-caption').textContent = current.project.title + ' / ' + current.viewTitle + ' (' + (activeImage + 1) + '/' + gallery.length + ')';
    viewerDetails.replaceChildren(make('h2', 'work-title', current.item.title), make('p', 'work-format', current.item.format), make('p', 'work-summary', current.item.summary), workDetails(current.item));
    viewerDetails.scrollTop = 0;
    viewerPrevious.disabled = activeImage === 0;
    viewerNext.disabled = activeImage === gallery.length - 1;
    viewerPrevious.hidden = viewerNext.hidden = gallery.length === 1;
    document.getElementById('viewer-navigation-hint').hidden = gallery.length === 1;
    viewer.querySelector('.viewer-stage').classList.toggle('viewer-stage-single', gallery.length === 1);
  }
  function openViewer(project, file, trigger) {
    gallery = project.images.flatMap(item => [{ file: item.file, title: item.viewTitle || item.title }, ...(item.views || [])].map(view => ({
      project, item, file: view.file, viewTitle: view.title,
      src: root + 'assets/images/' + view.file + '.webp',
      alt: project.title + ' — ' + item.title + (view.title === item.title ? '' : ': ' + view.title)
    })));
    const index = gallery.findIndex(view => view.file === file);
    if (index < 0) return;
    returnFocus = trigger;
    updateViewer(index);
    viewer.showModal();
    document.body.classList.add('viewer-open');
    document.getElementById('viewer-close').focus();
  }
  if (viewer && typeof viewer.showModal === 'function') {
    document.querySelectorAll('.work-image[data-view]').forEach(link => {
      const project = projects.find(project => project.id === link.closest('[data-project]').dataset.project);
      if (!project) return;
      link.setAttribute('aria-haspopup', 'dialog');
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openViewer(project, link.dataset.view, link);
      });
    });
    document.getElementById('viewer-close').addEventListener('click', () => viewer.close());
    viewerPrevious.addEventListener('click', () => updateViewer(activeImage - 1));
    viewerNext.addEventListener('click', () => updateViewer(activeImage + 1));
    viewer.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        updateViewer(activeImage + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
    viewer.addEventListener('close', () => {
      document.body.classList.remove('viewer-open');
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    });
  }

  function enhanceShowcase(section) {
    const project = projects.find(project => project.id === section.id);
    if (!project) return;
    const viewport = section.querySelector('.carousel-viewport');
    const works = Array.from(viewport.children);
    if (!works.length) return;
    const items = works.map(work => project.images.find(item => item.file === work.dataset.work));
    const footer = section.querySelector('.showcase-footer');
    const controls = section.querySelector('.carousel-controls');
    const previous = controls.querySelector('[data-direction="prev"]');
    const next = controls.querySelector('[data-direction="next"]');
    const counter = controls.querySelector('.carousel-counter');
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-roledescription', 'карусель');
    let panels = [];
    let groups = [];
    let active = 0;
    let columns = 0;
    function update(index) {
      active = Math.max(0, Math.min(index, panels.length - 1));
      previous.disabled = active === 0;
      next.disabled = active === panels.length - 1;
      counter.textContent = (active + 1) + ' / ' + panels.length;
      panels.forEach((panel, i) => { panel.inert = i !== active; });
    }
    function goTo(index) {
      const target = Math.max(0, Math.min(index, panels.length - 1));
      viewport.scrollTo({ left: panels[target].offsetLeft, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
    function layout() {
      const capacity = viewport.clientWidth >= 850 ? 2 : 1;
      if (columns === capacity) return;
      const focused = works.findIndex(work => work.contains(document.activeElement) || (viewer?.open && work.contains(returnFocus)));
      const currentWork = focused >= 0 ? focused : (groups[active]?.[0] || 0);
      const focusTarget = works.some(work => work.contains(document.activeElement)) ? document.activeElement : null;
      columns = capacity;
      groups = [];
      let row = [];
      function flush() { if (row.length) { groups.push(row); row = []; } }
      items.forEach((item, index) => {
        if (item.wide || item.carouselSolo) { flush(); groups.push([index]); }
        else { row.push(index); if (row.length === capacity) flush(); }
      });
      flush();
      panels = groups.map((group, i) => {
        const panel = make('div', 'carousel-panel' + (group.length === 1 ? ' carousel-panel-single' : ''));
        panel.setAttribute('role', 'group');
        panel.setAttribute('aria-roledescription', 'слайд');
        panel.setAttribute('aria-label', (i + 1) + ' из ' + groups.length);
        group.forEach(index => panel.append(works[index]));
        return panel;
      });
      viewport.replaceChildren(...panels);
      section.classList.add('carousel-ready');
      controls.hidden = panels.length === 1;
      footer.hidden = project.showProjectLink === false && panels.length === 1;
      update(Math.max(0, groups.findIndex(group => group.includes(currentWork))));
      viewport.scrollTo({ left: panels[active].offsetLeft, behavior: 'auto' });
      focusTarget?.focus({ preventScroll: true });
    }
    previous.addEventListener('click', () => goTo(active - 1));
    next.addEventListener('click', () => goTo(active + 1));
    viewport.addEventListener('keydown', event => {
      const targets = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: panels.length - 1 };
      if (!(event.key in targets)) return;
      event.preventDefault();
      goTo(targets[event.key]);
    });
    let pending = false;
    viewport.addEventListener('scroll', () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        let closest = 0;
        panels.forEach((panel, i) => {
          if (Math.abs(panel.offsetLeft - viewport.scrollLeft) < Math.abs(panels[closest].offsetLeft - viewport.scrollLeft)) closest = i;
        });
        if (active !== closest) update(closest);
      });
    }, { passive: true });
    layout();
    new ResizeObserver(layout).observe(viewport);
  }
  // Static links and all descriptions remain usable when enhancement is unavailable.
  if (typeof ResizeObserver === 'function') document.querySelectorAll('.project-showcase').forEach(enhanceShowcase);
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
