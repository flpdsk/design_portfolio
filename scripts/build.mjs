import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const site = fileURLToPath(new URL('../', import.meta.url));
const context = { window: {} };
vm.runInNewContext(await readFile(path.join(site, 'assets/content.js'), 'utf8'), context);
const projects = context.window.PORTFOLIO_PROJECTS;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const paragraph = (className, text) => text ? `<p class="${className}">${escape(text)}</p>` : '';
const details = item => {
  const rows = [['Что делал', item.role], ['Авторство', item.team], ['Результат', item.status]];
  return `<dl class="work-details">${rows.filter(([, value]) => value).map(([label, value]) => `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`;
};
const heading = (project, tag) => `<div class="project-heading"><${tag} id="${project.id}-title">${escape(project.displayTitle || project.title)}</${tag}><span class="project-heading-divider" aria-hidden="true">|</span><time class="project-year" datetime="${project.year}">${project.year}</time></div>`;
function work(project, item, compact, root) {
  const caption = `${project.id}-${item.file}-caption`;
  const views = [{ file: item.file, title: item.viewTitle || item.title }, ...(item.views || [])];
  const classes = ['work', item.wide && 'work-wide', item.portrait && 'work-portrait', item.square && 'work-square'].filter(Boolean).join(' ');
  const images = views.map(view => {
    const cropped = Number.isFinite(view.previewCrop) && view.previewCrop > 0;
    const classes = ['work-image', (view.fit || item.fit) === 'contain' && 'work-image-contain', cropped && 'work-image-cropped'].filter(Boolean).join(' ');
    const suffix = view.title === item.title ? '' : ': ' + view.title;
    const src = `${root}assets/images/${view.file}.webp`;
    return `<a class="${classes}" href="${src}" data-view="${view.file}" aria-label="${escape('Открыть: ' + item.title + suffix)}" aria-describedby="${caption}"${cropped ? ` style="--preview-ratio:${view.previewCrop}"` : ''}><span class="work-image-motion"><img src="${src}" alt="${escape(project.title + ' — ' + item.title + suffix)}" loading="lazy" decoding="async"></span><span class="image-expand" aria-hidden="true">↗</span>${views.length > 1 ? `<span class="view-label">${escape(view.title)}</span>` : ''}</a>`;
  }).join('\n');
  const credit = `<dl class="work-team"><dt class="work-team-label">Авторство:</dt><dd>${escape(item.team)}</dd></dl>`;
  return `<figure class="${classes}" data-project="${project.id}" data-work="${item.file}"><div class="work-views${views.length > 1 ? ' views-' + (item.layout || 'pair') : ''}">${images}</div><figcaption id="${caption}"><${compact ? 'h3' : 'h2'} class="work-title">${escape(item.title)}</${compact ? 'h3' : 'h2'}>${compact ? '' : paragraph('work-format', item.format)}${paragraph('work-summary', item.summary)}${compact ? credit : details(item)}</figcaption></figure>`;
}
function showcase(project) {
  const items = project.images;
  const link = project.showProjectLink === false ? '' : `<a class="project-link" href="projects/${project.id}.html">Посмотреть весь проект →</a>`;
  return `<section class="project-showcase wrap" id="${project.id}" aria-labelledby="${project.id}-title" aria-describedby="${project.id}-overview"><header class="showcase-header">${heading(project, 'h2')}<p class="showcase-description" id="${project.id}-overview">${escape(project.overview)}</p></header><div class="carousel-viewport" aria-label="Работы проекта «${escape(project.title)}»">${items.map(item => work(project, item, true, '')).join('\n')}</div><div class="showcase-footer"${!link ? ' hidden' : ''}>${link}<div class="carousel-controls" hidden><button type="button" data-direction="prev" aria-label="Предыдущие работы: ${escape(project.title)}">←</button><span class="carousel-counter" aria-live="polite" aria-atomic="true"></span><button type="button" data-direction="next" aria-label="Следующие работы: ${escape(project.title)}">→</button></div></div></section>`;
}
function projectPage(project) {
  return `<header class="project-page-intro">${heading(project, 'h1')}${paragraph('project-description', project.description)}${paragraph('project-context', project.context)}</header><div class="project-grid${project.images.length === 1 ? ' project-grid-single' : ''}">${project.images.map(item => work(project, item, false, '../')).join('\n')}</div>`;
}
const check = process.argv.includes('--check');
let outdated = false;
for (const project of [null, ...projects]) {
  const file = path.join(site, project ? `projects/${project.id}.html` : 'index.html');
  const html = await readFile(file, 'utf8');
  const fragment = project ? projectPage(project) : projects.map(showcase).join('\n');
  const marker = /<!-- portfolio:start -->[\s\S]*?<!-- portfolio:end -->/;
  if (!marker.test(html)) throw new Error(`Missing portfolio markers in ${file}`);
  const updated = html.replace(marker, () => `<!-- portfolio:start -->\n${fragment}\n<!-- portfolio:end -->`);
  if (updated !== html) {
    if (check) { console.error(`Needs regeneration: ${file}`); outdated = true; }
    else await writeFile(file, updated);
  }
}
if (outdated) process.exitCode = 1;
else console.log(check ? 'Static pages are up to date.' : 'Generated 4 static pages.');
