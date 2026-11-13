import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fixture } from './dom-fixture.mjs';
const site = fileURLToPath(new URL('../', import.meta.url));

test('static pages retain all works, image links and descriptions before JavaScript', () => {
  const app = fixture();
  for (const project of app.projects) {
    const html = readFileSync(path.join(site, `projects/${project.id}.html`), 'utf8');
    assert.ok(html.includes(`<h1 id="${project.id}-title">`));
    assert.equal((html.match(/<figure /g) || []).length, project.images.length);
    for (const item of project.images) {
      assert.ok(html.includes(item.summary));
      for (const view of [{ file: item.file }, ...(item.views || [])]) {
        assert.ok(existsSync(path.join(site, 'assets/images', view.file + '.webp')));
        assert.ok(html.includes(`href="../assets/images/${view.file}.webp"`));
      }
    }
  }
  const home = readFileSync(path.join(site, 'index.html'), 'utf8');
  assert.equal((home.match(/<figure /g) || []).length, 20);
  assert.equal((home.match(/data-view="/g) || []).length, 39);
  for (const project of app.projects) {
    for (const item of project.images) {
      assert.ok(home.includes(`data-work="${item.file}"`));
      for (const view of [{ file: item.file }, ...(item.views || [])]) {
        assert.ok(home.includes(`href="assets/images/${view.file}.webp"`));
      }
    }
  }
});

test('viewer stays within the selected project, stops at endpoints and restores focus', () => {
  const app = fixture();
  const d = app.document;
  const first = d.querySelector('.work-image[data-view]');
  first.focus();
  assert.equal(app.click(first), true);
  assert.equal(d.getElementById('viewer').open, true);
  assert.match(d.getElementById('viewer-caption').textContent, /Студент года.*\(1\/12\)/);
  assert.equal(d.getElementById('viewer-prev').disabled, true);
  app.key(d.getElementById('viewer'), 'ArrowLeft');
  assert.match(d.getElementById('viewer-caption').textContent, /\(1\/12\)/);
  for (let i = 0; i < 20; i++) app.key(d.getElementById('viewer'), 'ArrowRight');
  assert.match(d.getElementById('viewer-caption').textContent, /Студент года.*\(12\/12\)/);
  assert.equal(d.getElementById('viewer-next').disabled, true);
  app.click(d.getElementById('viewer-close'));
  assert.equal(d.activeElement, first);
  assert.equal(d.getElementById('viewer').open, false);
  assert.equal(app.click(first, { ctrlKey: true }), false, 'modified clicks retain the image link');
});

test('one-image project has no navigation buttons or hint', () => {
  for (const page of [undefined, 'perspective']) {
    const app = fixture(page);
    const d = app.document;
    const image = d.querySelector('[data-work="perspective-cover"]').querySelector('.work-image');
    app.click(image);
    assert.equal(d.getElementById('viewer-prev').hidden, true);
    assert.equal(d.getElementById('viewer-next').hidden, true);
    assert.equal(d.getElementById('viewer-navigation-hint').hidden, true);
    assert.match(d.getElementById('viewer-caption').textContent, /\(1\/1\)/);
  }
});

test('desktop and narrow carousel grouping, keyboard endpoints and focus after resize', () => {
  const app = fixture();
  const sections = app.document.querySelectorAll('.project-showcase');
  const count = () => sections.map(section => section.querySelector('.carousel-viewport').children.length);
  assert.deepEqual(count(), [5, 10, 1]);
  const viewport = sections[0].querySelector('.carousel-viewport');
  app.key(viewport, 'End');
  assert.equal(sections[0].querySelector('.carousel-counter').textContent, '5 / 5');
  assert.equal(sections[0].querySelector('[data-direction="next"]').disabled, true);
  app.key(viewport, 'Home');
  const image = sections[0].querySelector('.work-image'); image.focus();
  app.resize(360);
  assert.deepEqual(count(), [6, 13, 1]);
  assert.equal(app.document.activeElement, image);
  assert.equal(sections[2].querySelector('.showcase-footer').hidden, true);
});

test('every full-project image opens with its corresponding source', () => {
  for (const id of ['student', 'sopka', 'perspective']) {
    const app = fixture(id);
    for (const link of app.document.querySelectorAll('.work-image[data-view]')) {
      app.click(link);
      assert.equal(app.document.getElementById('viewer-image').src, link.href);
      app.click(app.document.getElementById('viewer-close'));
    }
  }
});
