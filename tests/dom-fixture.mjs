// Minimal DOM stand-in for interaction tests. It does not measure browser layout.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const site = fileURLToPath(new URL('../', import.meta.url));
const decode = text => text.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[name]);
export function fixture(project, width = 1100) {
  let viewportWidth = width;
  const observers = [];
  let document;
  class Element {
    constructor(tag) {
      this.tagName = tag; this.children = []; this.attrs = {}; this.dataset = {};
      this.handlers = {}; this.scrollLeft = 0; this.scrollTop = 0;
      this.className = ''; this.textContent = ''; this.hidden = false;
      this.classList = {
        add: name => { if (!this.className.split(' ').includes(name)) this.className += ' ' + name; },
        remove: name => { this.className = this.className.split(' ').filter(value => value !== name).join(' '); },
        toggle: (name, enabled) => enabled ? this.classList.add(name) : this.classList.remove(name)
      };
    }
    append(...children) {
      for (const child of children) {
        if (child.parentElement) child.parentElement.children = child.parentElement.children.filter(value => value !== child);
        child.parentElement = this; this.children.push(child);
      }
    }
    replaceChildren(...children) { this.children.forEach(child => { child.parentElement = null; }); this.children = []; this.append(...children); }
    setAttribute(key, value) {
      this.attrs[key] = value;
      if (key === 'class') this.className = value;
      if (key === 'id') this.id = value;
      if (key === 'href') this.href = value;
      if (key === 'src') this.src = value;
      if (key === 'hidden') this.hidden = true;
      if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    matches(selector) {
      const classes = [...selector.matchAll(/\.([\w-]+)/g)].map(match => match[1]);
      const attrs = [...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
      return classes.every(name => this.className.split(' ').includes(name)) && attrs.every(([, key, value]) => key in this.attrs && (value === undefined || this.attrs[key] === value));
    }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); }
    contains(element) { return this === element || this.children.some(child => child.contains(element)); }
    addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); }
    dispatch(name, event = {}) { for (const handler of this.handlers[name] || []) handler(event); }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatch('close'); }
    get isConnected() { return document.contains(this); }
    get clientWidth() { return viewportWidth; }
    get offsetLeft() { return this.parentElement.children.indexOf(this) * (viewportWidth + 24); }
    scrollTo({ left }) { this.scrollLeft = left; this.dispatch('scroll'); }
  }
  document = new Element('document');
  document.createElement = tag => new Element(tag);
  document.getElementById = id => document.querySelectorAll('[id]').find(node => node.id === id);
  const html = readFileSync(path.join(site, project ? `projects/${project}.html` : 'index.html'), 'utf8');
  const stack = [document];
  const voidTags = new Set(['meta', 'link', 'img', 'br', 'hr', 'input']);
  for (const token of html.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]*>|[^<]+/g)) {
    if (token.startsWith('<!')) continue;
    if (token.startsWith('</')) { stack.pop(); continue; }
    if (!token.startsWith('<')) { stack.at(-1).textContent += decode(token); continue; }
    const tag = token.match(/^<([\w-]+)/)[1];
    const node = new Element(tag);
    for (const [, key, value] of token.slice(tag.length + 1, -1).matchAll(/([\w-]+)(?:="([^"]*)")?/g)) node.setAttribute(key, decode(value || ''));
    stack.at(-1).append(node);
    if (tag === 'body') document.body = node;
    if (!voidTags.has(tag)) stack.push(node);
  }
  document.activeElement = document.body;
  const context = vm.createContext({
    window: { matchMedia: () => ({ matches: true }) }, document,
    requestAnimationFrame: handler => handler(),
    ResizeObserver: class { constructor(handler) { this.handler = handler; } observe() { observers.push(this.handler); } }
  });
  vm.runInContext(readFileSync(path.join(site, 'assets/content.js'), 'utf8'), context);
  vm.runInContext(readFileSync(path.join(site, 'assets/main.js'), 'utf8'), context);
  return {
    document, projects: context.window.PORTFOLIO_PROJECTS,
    resize: width => { viewportWidth = width; observers.forEach(handler => handler()); },
    click(node, extra = {}) { let prevented = false; node.dispatch('click', { button: 0, preventDefault() { prevented = true; }, ...extra }); return prevented; },
    key(node, key) { node.dispatch('keydown', { key, preventDefault() {} }); }
  };
}
