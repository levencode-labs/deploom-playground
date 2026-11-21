'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '../docs', file), 'utf8');
const html = read('handbook.html');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(match => ({
  file: match[1].match(/\bsrc=["']([^"']+)["']/)?.[1],
  inline: match[2],
}));

test('the handbook ships a bilingual catalog with unique routes, worked examples and interactive outcomes', () => {
  const chapters = reader('ru', true).ctx.DepLoomBookChapters;
  assert.match(read('index.html'), /href=["']handbook\.html(?:[?#][^"']*)?["']/);
  const ids = new Set();
  function id(value) {
    assert.match(value, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!ids.has(value), 'Duplicate handbook ID: ' + value);
    ids.add(value);
  }
  function translated(pair, context) {
    assert.ok(Array.isArray(pair) && pair.length === 2, context);
    assert.ok(pair.every(value => typeof value === 'string' && value.trim()), context);
  }
  assert.ok(chapters.length > 1);
  for (const chapter of chapters) {
    id(chapter.id);
    translated(chapter.title, chapter.id);
    assert.ok(chapter.lessons.length);
    for (const lesson of chapter.lessons) {
      id(lesson.id);
      for (const pair of [lesson.title, lesson.lead, lesson.check, lesson.lab.prompt]) translated(pair, lesson.id);
      assert.ok(lesson.examples.length, lesson.id);
      for (const example of lesson.examples) {
        translated(example.title, lesson.id);
        translated(example.body, lesson.id);
      }
      assert.ok(lesson.lab.states.length > 1, lesson.id);
      for (const state of lesson.lab.states) {
        for (const pair of [state.label, state.value, state.detail]) translated(pair, lesson.id);
        assert.ok(['ok', 'warn', 'bad', 'neutral'].includes(state.tone), lesson.id);
      }
      for (const source of lesson.sources || []) {
        translated(source.label, lesson.id);
        assert.equal(new URL(source.url).protocol, 'https:', lesson.id);
      }
    }
  }
});

// Exercise the production navigation and hash router. Model the browser's elements only;
// the separate experiment renderer isn't needed for link/navigation assertions.
function element(tag) {
  return {
    tag, children: [], listeners: {}, attrs: {}, classList: {toggle() {}},
    append(...children) { this.children.push(...children); },
    prepend(...children) { this.children.unshift(...children); },
    replaceChildren(...children) { this.children = children; },
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; },
    addEventListener(name, listener) { this.listeners[name] = listener; },
    querySelector(name) { return this.querySelectorAll(name)[0] || null; },
    querySelectorAll(name) { return descendants(this).filter(child => child.tag === name); },
    focus() {}, scrollIntoView() {},
  };
}
function descendants(node) {
  return node.children.filter(item => typeof item === 'object').flatMap(item => [item, ...descendants(item)]);
}

function reader(language, withExtension) {
  const pathname = withExtension ? 'handbook.html' : 'handbook';
  const location = new URL('https://example.github.io/deploom-playground/' + pathname + '?lang=' + language);
  const events = {};
  const main = element('main'), header = element('header');
  const article = element('article'), contents = element('aside'), chapters = element('nav'), toggle = element('button');
  toggle.append(element('span'));
  const selectors = {'main': main, '.book': main, '[data-nav]': header, '#book-contents': contents,
    '#book-lesson': article, '#chapters': chapters, '#book-menu-toggle': toggle};
  const ctx = vm.createContext({
    URL, URLSearchParams, location,
    document: {documentElement: {}, head: element('head'), createElement: element, addEventListener() {},
      querySelector(selector) {
        if (selector === '.bar .skip') return descendants(header).find(el => el.className === 'skip');
        assert.ok(selectors[selector], 'Missing page selector: ' + selector);
        return selectors[selector];
      }},
    addEventListener(name, listener) { events[name] = listener; },
    matchMedia() { return {matches: false, addEventListener() {}}; },
  });
  ctx.window = ctx;
  for (const {file, inline} of scripts) {
    if (file === 'handbook-labs.js') ctx.DepLoomBookLabs = {render: () => element('section')};
    else vm.runInContext(file ? read(file) : inline, ctx, {filename: file || 'handbook.html'});
  }
  return {ctx, header, article, contents, chapters, toggle, go(id) { location.hash = id; events.hashchange(); }};
}

for (const [language, translation, extension] of [['ru', 0, true], ['en', 1, false]]) {
  test('direct handbook navigation, lesson fragments and legacy practice links (' + language + ')', () => {
    const {ctx, header, article, contents, chapters, toggle, go} = reader(language, extension);
    const nav = header.querySelector('nav');
    const handbook = nav.children.filter(el => el.tag === 'a' && new URL(el.href).pathname.endsWith('/handbook.html'));
    assert.equal(handbook.length, 1, 'The handbook must be one direct navigation link');
    assert.equal(handbook[0].attrs['aria-current'], 'page');
    assert.ok(!nav.querySelectorAll('details').some(group => group.querySelectorAll('a').some(a => /\/(?:handbook|examples)\.html/.test(a.href))));
    toggle.listeners.click();
    assert.equal(contents.hidden, true);
    toggle.listeners.click();
    assert.equal(contents.hidden, false);
    const lessons = ctx.DepLoomBookChapters.flatMap(chapter => chapter.lessons);
    const toc = chapters.querySelectorAll('a');
    assert.deepEqual(toc.map(a => a.href), Array.from(lessons, lesson => '#' + lesson.id));

    const targets = new Set();
    for (const [index, lesson] of lessons.entries()) {
      go(lesson.id);
      assert.equal(article.querySelector('h1').textContent, lesson.title[translation]);
      assert.deepEqual(toc.filter(a => a.attrs['aria-current'] === 'page'), [toc[index]]);
      const links = article.querySelectorAll('a');
      for (const [rel, neighbor] of [['prev', lessons[index - 1]], ['next', lessons[index + 1]]]) {
        assert.equal(links.find(a => a.rel === rel)?.href, neighbor && '#' + neighbor.id);
      }
      for (const anchor of links.filter(a => a.className === 'practice-link')) {
        const url = new URL(anchor.href);
        assert.equal(url.origin, ctx.location.origin);
        assert.equal(url.searchParams.get('lang'), language);
        assert.ok(url.pathname.startsWith('/deploom-playground/'), anchor.href);
        const file = url.pathname.slice('/deploom-playground/'.length);
        assert.match(file, /^[\w-]+\.html$/);
        const target = read(file);
        if (url.hash) {
          const ids = [...target.matchAll(/\sid=["']([^"']+)["']/gi)].map(match => match[1]);
          assert.ok(ids.includes(decodeURIComponent(url.hash.slice(1))), anchor.href);
        }
        url.searchParams.delete('lang');
        url.searchParams.sort();
        targets.add(file + url.search + url.hash);
      }
    }
    const exercises = ['examples.html#quick-merge', 'combinations.html', 'combinations.html#build-mr',
      'tree.html?example=webpack-groups&view=packages', 'ci.html', 'peers.html', 'runtime.html', 'override.html'];
    for (const target of exercises) {
      assert.ok(targets.has(target), 'Former exercise missing from handbook: ' + target);
    }
    go('unknown-lesson');
    assert.equal(article.querySelector('h1').textContent, lessons[0].title[translation]);
  });
}
