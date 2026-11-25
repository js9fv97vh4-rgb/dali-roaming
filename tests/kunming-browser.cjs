/* Run against npm run dev with Playwright available in Node. */
const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.KUNMING_PLAYWRIGHT_PATH || 'playwright');

const url = process.env.KUNMING_PREVIEW_URL || 'http://127.0.0.1:8765/';
const screenshotDir = process.env.KUNMING_SCREENSHOT_DIR;

async function checkMapLayout(page, width) {
  await page.setViewportSize({width, height: 1000});
  const geometry = await page.locator('#km-map').evaluate(map => {
    const bounds = map.getBoundingClientRect();
    const pins = Array.from(map.querySelectorAll('.km-pin'), pin => {
      const {left, top, right, bottom, width, height} = pin.getBoundingClientRect();
      return {name: pin.textContent, left, top, right, bottom, width, height};
    });
    return {
      overflows: document.documentElement.scrollWidth > innerWidth,
      bounds: {left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom},
      pins
    };
  });
  assert(!geometry.overflows, 'Page overflow at width ' + width);
  assert.equal(geometry.pins.length, 5);
  for (const [i, pin] of geometry.pins.entries()) {
    assert(pin.width >= 44 && pin.height >= 44, pin.name + ' tap target');
    assert(pin.left >= geometry.bounds.left && pin.right <= geometry.bounds.right, pin.name + ' horizontal bounds');
    assert(pin.top >= geometry.bounds.top && pin.bottom <= geometry.bounds.bottom, pin.name + ' vertical bounds');
    for (const other of geometry.pins.slice(i + 1)) {
      assert(pin.right <= other.left || other.right <= pin.left || pin.bottom <= other.top || other.bottom <= pin.top,
        pin.name + ' overlaps ' + other.name + ' at width ' + width);
    }
  }
}

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.KUNMING_CHROME_PATH,
    args: ['--disable-webgl']
  });
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
    page.setDefaultTimeout(6000);
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    await page.goto(url + '#kunming');
    await page.locator('#km-atlas').waitFor();
    await page.locator('[data-km-atlas]').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'km-atlas-title');
    await page.waitForFunction(() => document.querySelector('.km-terrain').naturalWidth > 0);

    for (const width of [1440, 1100, 820, 751, 600, 501, 390, 320]) {
      await checkMapLayout(page, width);
      if (screenshotDir && [1440, 751, 390].includes(width)) {
        await page.locator('#km-atlas').screenshot({path: path.join(screenshotDir, `map-${width}.png`)});
      }
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-km-zoom="in"]').click();
    assert(await page.locator('#km-map-viewport').evaluate(el => el.scrollWidth > el.clientWidth));
    await page.locator('[data-km-zoom="reset"]').click();
    assert.equal(await page.locator('#km-zoom-level').textContent(), '100%');
    for (const id of ['jacaranda', 'old-street', 'cuihu', 'dianchi', 'dounan']) {
      const pin = page.locator(`[data-km-spot="${id}"]`);
      await pin.click();
      assert.equal(await pin.getAttribute('aria-current'), 'location');
      assert.equal(await page.locator('#km-feature h3').textContent(), await page.locator('#km-story-title').textContent());
      await page.locator('[data-km-dismiss]').click();
      await page.locator('#km-story').waitFor({state:'hidden'});
      assert.equal(await page.evaluate(() => document.activeElement.dataset.kmSpot), id);
    }

    for (const [filter, count, teaVisible] of [['flowers',2,false],['lake',2,false],['city',1,true],['all',5,true]]) {
      await page.locator(`.km-filters [data-km-filter="${filter}"]`).click();
      assert.equal(await page.locator('.km-card').count(), count);
      assert.equal(await page.locator('#km-tea').isVisible(), teaVisible);
    }
    await page.locator('#km-tea-read').click();
    const before = await page.locator('#km-story img').first().elementHandle();
    await page.locator('#km-story [data-km-save]').click();
    assert(await before.evaluate(img => img.isConnected), 'Saving rebuilt the photo');
    await page.reload();
    await page.locator('.km-filters [data-km-filter="saved"]').click();
    assert(await page.locator('#km-tea').isVisible());
    assert.equal(await page.locator('#km-saved-count').textContent(), '1');
    await page.locator('#km-tea [data-km-save]').click();
    assert(await page.locator('#km-empty').isVisible());

    await page.goto(url + '#kunming?spot=old-street');
    await page.locator('#km-story [data-km-frame="0"]').click();
    const photo = page.locator('#km-photo-dialog');
    await photo.waitFor();
    const first = page.url();
    await page.keyboard.press('ArrowRight');
    assert.notEqual(page.url(), first);
    await page.keyboard.press('ArrowLeft');
    assert.equal(page.url(), first);
    await page.keyboard.press('Escape');
    await photo.waitFor({state:'hidden'});
    await page.goForward();
    await photo.waitFor();
    await page.locator('[data-km-photo-map]').click();
    await photo.waitFor({state:'hidden'});
    await page.waitForFunction(() => document.activeElement.dataset.kmSpot === 'old-street');
    await page.goto(url + '#kunming?spot=old-street&frame=101');
    await photo.waitFor();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Escape');
    await photo.waitFor({state:'hidden'});
    assert.equal(new URL(page.url()).hash, '#kunming?spot=old-street');
    await page.goto(url + '#kunming?spot=dounan&frame=999');
    await page.waitForFunction(() => location.hash === '#kunming?spot=dounan');
    assert.equal(await page.locator('#km-story-title').textContent(), '斗南花市');
    await page.locator('[data-km-share]').click();
    await page.waitForFunction(() => document.getElementById('km-share-feedback').textContent.length > 0);
    assert(!requests.some(request => /\/(?:three[^/]*\.js|map3d[^/]*\.js|terrain\/)/.test(request)), 'Kunming loaded the 3D engine');

    const failures = await browser.newPage({viewport: {width: 390, height: 844}});
    failures.setDefaultTimeout(6000);
    let offline = true;
    const fixture = path.join(__dirname, '../web/assets/kunming/night-market-thumb.webp');
    await failures.route('**/dianchi-relief.webp', route => route.abort());
    await failures.route('**/*cc4d2c216cae4ed3b2aec8e38ef6faa5.jpg', route => offline ? route.abort() : route.fulfill({path: fixture}));
    let failThumb = true;
    await failures.route('**/night-market-thumb.webp', route => failThumb ? route.abort() : route.continue());
    await failures.goto(url + '#kunming');
    await failures.locator('[data-km-spot="dounan"]').click();
    assert(await failures.locator('#km-story').isVisible(), 'Missing relief disabled map selection');
    const localMedia = failures.locator('#km-feature [data-km-media]');
    await localMedia.locator('[data-km-retry]').waitFor();
    failThumb = false;
    await localMedia.locator('[data-km-retry]').click();
    await localMedia.locator('img').waitFor();
    await failures.goto(url + '#kunming?spot=dounan&frame=101');
    const remoteMedia = failures.locator('#km-photo-dialog [data-km-media]');
    await remoteMedia.locator('[data-km-retry]').waitFor();
    assert.match(await remoteMedia.locator('.km-image-recovery a').getAttribute('href'), /xinhuanet/);
    offline = false;
    await remoteMedia.locator('[data-km-retry]').click();
    await remoteMedia.locator('img').waitFor();
    await failures.close();

    for (const width of [820, 600, 390]) {
      await page.setViewportSize({width,height:1000});
      for (const route of ['yunnan','erhai','lijiang','kunming']) {
        await page.goto(url + '#' + route);
        assert(await page.locator('#' + route + '-page').isVisible(), route);
        const navFits = await page.locator('.site-header nav').evaluate(nav =>
          Array.from(nav.children).every(el => el.getBoundingClientRect().right <= innerWidth)
        );
        assert(navFits, route + ' header overflow at ' + width);
      }
    }
    await page.goto(url + '#yunnan');
    await page.locator('#kunming-star').press('Enter');
    await page.waitForURL('**/#kunming');
    await page.locator('#credits-button').click();
    await page.locator('#credits-dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('#credits-dialog').waitFor({state:'hidden'});
    assert.deepEqual(errors, []);
    console.log('Kunming browser checks passed: layout, zoom, selection, saving, sharing, photo navigation, image recovery, and cross-page navigation.');
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
