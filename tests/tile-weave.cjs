'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const http = require('node:http');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const docs = path.resolve(__dirname, '../docs');
const strands = '.tile-weave path[data-woven]';

// Sample the curves themselves. A moving highlight or a scaled card cannot satisfy this check.
function profile(tile) {
  return tile.locator(strands).evaluateAll(paths => paths.map(path => {
    const length = path.getTotalLength();
    return [0, .2, .4, .6, .8, 1].flatMap(fraction => {
      const point = path.getPointAtLength(fraction * length);
      return [point.x, point.y];
    });
  }));
}

function distance(first, second) {
  return Math.max(...first.flatMap((strand, i) =>
    strand.map((coordinate, j) => Math.abs(coordinate - second[i][j]))));
}

function shines(tile) {
  return tile.evaluate(el => el.getAnimations({subtree:true})
    .filter(animation => animation.animationName === 'thread-glint')
    .map(animation => animation.effect.getTiming().iterations));
}

// On this tile both curves run from left to right. Measure their order at the same x.
function compareLanes(tile) {
  return tile.locator(strands).evaluateAll(paths => paths.slice(0, 2).map(path => {
    let low = 0;
    let high = path.getTotalLength();
    for (let i = 0; i < 12; i++) {
      const middle = (low + high) / 2;
      if (path.getPointAtLength(middle).x < 65) low = middle;
      else high = middle;
    }
    return path.getPointAtLength(high).y;
  }));
}

async function pointAt(page, tile) {
  const box = await tile.boundingBox();
  assert.ok(box, 'The tile is visible');
  await page.mouse.move(box.x + box.width / 2, box.y + 8);
}

async function exercise(page, homepage) {
  await page.clock.install({time: new Date('2026-01-01T00:00:00Z')});
  await page.goto(homepage + '?lang=en');
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  const tiles = page.locator('.tool-home [data-thread]');
  assert.equal(await tiles.count(), 6);
  const settle = () => page.clock.runFor(1200);
  let firstWoven;

  for (const tile of await tiles.all()) {
    const idle = await profile(tile);
    assert.ok(idle.length >= 2, 'Each tile has at least two strands');
    const compareTile = await tile.getAttribute('data-thread') === 'compare';
    const originalLanes = compareTile ? await compareLanes(tile) : null;
    await pointAt(page, tile);
    assert.deepEqual(await shines(tile), [1], 'The glint runs once per activation');
    await settle();
    if (compareTile) {
      const wovenLanes = await compareLanes(tile);
      assert.ok((originalLanes[0] - originalLanes[1]) * (wovenLanes[0] - wovenLanes[1]) < 0,
        'The two strands exchange their vertical order at the same position along the tile');
    }
    const woven = await profile(tile);
    assert.ok(idle.filter((strand, i) => distance([strand], [woven[i]]) > 1).length >= 2,
      'At least two fibers change shape independently');
    for (const [i, strand] of idle.entries()) {
      assert.ok(distance([[...strand.slice(0,2), ...strand.slice(-2)]],
        [[...woven[i].slice(0,2), ...woven[i].slice(-2)]]) < .1, 'Fiber endpoints stay pinned');
    }
    if (!firstWoven) firstWoven = woven;
    await page.mouse.move(0, 0);
    await settle();
    assert.ok(distance(idle, await profile(tile)) < .1, 'The original drawing is restored');
  }

  const tile = tiles.first();
  const idle = await profile(tile);
  await pointAt(page, tile);
  await page.clock.runFor(220);
  const partial = await profile(tile);
  const fullDistance = distance(idle, firstWoven);
  assert.ok(distance(idle, partial) > .1 && distance(partial, firstWoven) > .1,
    'Pointer departure can interrupt a partially woven drawing');
  await page.mouse.move(0, 0);
  assert.ok(distance(partial, await profile(tile)) < .1, 'Reversing does not jump on pointer leave');
  await page.clock.runFor(48);
  const reversing = await profile(tile);
  assert.ok(distance(idle, reversing) < distance(idle, partial) && distance(idle, reversing) > .1,
    'The drawing moves back through an intermediate position');
  await pointAt(page, tile);
  assert.ok(distance(reversing, await profile(tile)) < .1, 'Rapid re-entry resumes from the current shape');
  await settle();
  assert.ok(distance(firstWoven, await profile(tile)) / fullDistance < .01);
  await page.mouse.move(0, 0);
  await settle();

  await tiles.nth(1).focus();
  await page.keyboard.press('Shift+Tab');
  assert.ok(await tile.evaluate(el => el.matches(':focus-visible')));
  await settle();
  assert.ok(distance(firstWoven, await profile(tile)) < .1, 'Keyboard focus weaves the same strands');
  await pointAt(page, tile);
  await page.mouse.move(0, 0);
  await settle();
  assert.ok(distance(firstWoven, await profile(tile)) < .1, 'Pointer leave preserves active keyboard focus');
  await page.keyboard.press('Tab');
  await settle();
  assert.ok(distance(idle, await profile(tile)) < .1, 'Moving keyboard focus releases the strands');

  await page.emulateMedia({reducedMotion: 'reduce'});
  await pointAt(page, tile);
  await page.clock.runFor(220);
  assert.ok(distance(idle, await profile(tile)) < .1, 'Reduced motion keeps threads still');
  assert.deepEqual(await shines(tile), []);
}

(async () => {
  const server = http.createServer(async (request, response) => {
    const file = path.resolve(docs, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(docs + path.sep)) return response.writeHead(404).end();
    try {
      const content = await fs.readFile(file);
      const types = {'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
      response.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'}).end(content);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const homepage = 'http://127.0.0.1:' + server.address().port + '/index.html';
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
    const page = await browser.newPage({viewport:{width:1280,height:1000}});
    await exercise(page, homepage);
    console.log('PASS all six tile weaves, smooth interruption, keyboard focus and reduced motion');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
