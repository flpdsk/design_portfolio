(() => {
  'use strict';
  const projects = window.PORTFOLIO_PROJECTS || [];
  const list = document.getElementById('project-list');
  const gallery = [];
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  projects.forEach(project => {
    const section = make('section', `project${project.images.length === 1 ? ' project-single' : ''}`);
    section.id = project.id;
    section.setAttribute('aria-labelledby', `${project.id}-title`);
    const header = make('div', 'project-header');
    const number = make('span', 'project-number', `/${project.number}`);
    const intro = make('div', 'project-intro');
    intro.append(make('p', 'eyebrow muted', project.category));
    const title = make('h3', '', project.title);
    title.id = `${project.id}-title`;
    intro.append(title, make('p', 'project-description', project.description));
    if (project.context) intro.append(make('p', 'project-context', project.context));
    const imageCount = project.images.reduce((total, item) => total + 1 + (item.views?.length || 0), 0);
    header.append(number, intro, make('span', 'project-total', `Изображений: ${String(imageCount).padStart(2, '0')}`));
    const grid = make('div', 'project-grid');
    project.images.forEach((item, index) => {
      const figure = make('figure', `work${item.wide ? ' work-wide' : ''}${item.portrait ? ' work-portrait' : ''}`);
      const views = [{ file: item.file, title: item.viewTitle || item.title }, ...(item.views || [])];
      const media = make('div', `work-views${views.length > 1 ? ` views-${item.layout || 'pair'}` : ''}`);
      views.forEach(view => {
        const button = make('button', `work-image${view.fit === 'contain' ? ' work-image-contain' : ''}`);
        button.type = 'button';
        button.setAttribute('aria-label', `Увеличить: ${item.title}, ${view.title}, ${project.title}`);
        button.setAttribute('aria-describedby', `${project.id}-work-${index}-caption`);
        const img = make('img');
        img.src = `assets/images/${view.file}.webp`;
        img.alt = `${project.title} — ${item.title}${view.title !== item.title ? `: ${view.title}` : ''}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        const galleryIndex = gallery.length;
        const viewTitle = view.title === item.title ? '' : ` / ${view.title}`;
        gallery.push({ src: img.src, alt: img.alt, title: `${project.title} / ${item.title}${viewTitle}` });
        const motion = make('span', 'work-image-motion');
        motion.append(img);
        button.append(motion, make('span', 'image-expand', '↗'));
        if (views.length > 1) button.append(make('span', 'view-label', view.title));
        button.addEventListener('click', () => openViewer(galleryIndex));
        media.append(button);
      });
      const caption = make('figcaption');
      caption.id = `${project.id}-work-${index}-caption`;
      const captionTop = make('div', 'caption-top');
      captionTop.append(make('h4', '', item.title), make('span', 'caption-number', `${project.number}.${String(index + 1).padStart(2, '0')}`));
      caption.append(captionTop, make('p', 'work-format', item.format));
      const details = make('dl', 'work-details');
      [['Задача', item.task], ['Что делал', item.role || project.role], ['Команда', item.team || project.team], ['Результат', item.status]].forEach(([label, value]) => {
        if (!value && label === 'Результат') return;
        const row = make('div');
        row.append(make('dt', '', label), make('dd', value ? '' : 'pending', value || 'Описание дополняется'));
        details.append(row);
      });
      caption.append(details);
      figure.append(media, caption);
      grid.append(figure);
    });
    section.append(header, grid);
    list.append(section);
  });
  const viewer = document.getElementById('viewer');
  const viewerImage = document.getElementById('viewer-image');
  let active = 0;
  let returnFocus;
  function updateViewer(index) {
    active = (index + gallery.length) % gallery.length;
    viewerImage.src = gallery[active].src;
    viewerImage.alt = gallery[active].alt;
    document.getElementById('viewer-caption').textContent = `${gallery[active].title} (${active + 1}/${gallery.length})`;
  }
  function openViewer(index) {
    returnFocus = document.activeElement;
    updateViewer(index);
    viewer.showModal();
    document.body.classList.add('viewer-open');
    document.getElementById('viewer-close').focus();
  }
  document.getElementById('viewer-close').addEventListener('click', () => viewer.close());
  document.getElementById('viewer-prev').addEventListener('click', () => updateViewer(active - 1));
  document.getElementById('viewer-next').addEventListener('click', () => updateViewer(active + 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      updateViewer(active + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    returnFocus?.focus({ preventScroll: true });
  });
  document.getElementById('year').textContent = new Date().getFullYear();
})();
