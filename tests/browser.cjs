const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('http://127.0.0.1:8000');
  await page.waitForFunction(() => document.querySelector('#analyze').disabled);
  await page.getByRole('button', { name: 'サンプルを見る' }).click();
  assert.equal(await page.locator('.column').count(), 3);
  assert.deepEqual(await page.locator('.column').evaluateAll((cols) => cols.map((c) => c.querySelectorAll('.card').length)), [2, 1, 3]);
  await page.locator('.source summary').click();
  assert.match(await page.locator('.source p').innerText(), /リモートワーク/);
  await page.locator('.column').nth(2).locator('.card').nth(1).click();
  assert.equal(await page.locator('#detail h2').innerText(), '小さく試して、振り返る');
  await page.locator('#deepen-1').fill('通知を減らすには？');
  await page.locator('.column').nth(1).getByRole('button', { name: '深掘りする' }).click();
  assert.deepEqual(await page.locator('.column').evaluateAll((cols) => cols.map((c) => c.querySelectorAll('.card').length)), [2, 2, 3]);
  assert.match(await page.locator('#detail h2').innerText(), /通知を減らすには/);
  await page.reload();
  assert.equal(await page.locator('.card').count(), 7);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.card').first().click();
  await page.screenshot({ path: '/tmp/ai-matrix-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '/tmp/ai-matrix-desktop.png', fullPage: true });
  console.log('PASS: unsupported browser, sample, independent columns, selection, source, deepening, persistence, mobile overflow');

  await page.addInitScript(() => {
    localStorage.clear();
    window.calls = [];
    window.destroyed = 0;
    window.LanguageModel = {
      availability: async () => 'available',
      create: async (options) => {
        window.calls.push({ options });
        return {
          prompt: async (prompt, config) => {
            window.calls.push({ prompt, config });
            if (window.failNext) { window.failNext = false; throw new Error('simulated failure'); }
            if (window.badNext) { window.badNext = false; return '{"invalid":true}'; }
            const point = { title: '<img src=x onerror=alert(1)>', text: '安全なテキスト表示\n改行も保持' };
            return JSON.stringify(config.responseConstraint.type === 'array' ? [point] : {
              topic: 'テスト話題', perspectives: [{ title: '観点 A', points: [point] }, { title: '観点 B', points: [{ title: '別の深掘り', text: '詳細本文' }] }],
            });
          },
          destroy: () => { window.destroyed++; },
        };
      },
    };
  });
  await page.reload();
  await page.waitForFunction(() => !document.querySelector('#analyze').disabled);
  await page.locator('#post').fill('新しいプロジェクトの始め方');
  await page.locator('#analyze').click();
  await page.waitForSelector('.card');
  assert.equal(await page.locator('.column').count(), 2);
  assert.equal(await page.locator('#detail h2').innerText(), '<img src=x onerror=alert(1)>');
  assert.equal(await page.locator('#matrix img, #detail img').count(), 0);
  assert.equal(await page.evaluate(() => window.calls[0].options.expectedOutputs[0].languages[0]), 'ja');
  assert.equal(await page.evaluate(() => window.destroyed), 1);
  await page.locator('#deepen-0').fill('具体例をください');
  await page.evaluate(() => { window.failNext = true; });
  await page.locator('.column').first().getByRole('button', { name: '深掘りする' }).click();
  await page.waitForFunction(() => !document.querySelector('.column-error').hidden);
  assert.equal(await page.locator('#deepen-0').inputValue(), '具体例をください');
  assert.equal(await page.locator('.card').count(), 2);
  await page.locator('.column').first().getByRole('button', { name: '深掘りする' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.card').length === 3);
  assert.equal(await page.locator('#deepen-0').inputValue(), '');
  assert.equal(await page.locator('.card[aria-pressed="true"]').count(), 1);
  await page.evaluate(() => { window.badNext = true; });
  await page.locator('#post').fill('次の投稿');
  await page.locator('#analyze').click();
  await page.waitForFunction(() => !document.querySelector('#error').hidden);
  assert.equal(await page.locator('.card').count(), 3);
  assert.equal(await page.locator('#post').inputValue(), '次の投稿');
  assert.equal(await page.evaluate(() => window.destroyed), 4);
  assert.equal(await page.locator('#analyze').isEnabled(), true);
  assert.deepEqual(errors, []);
  console.log('PASS: AI request, structured output, language options, XSS safety, per-column generation, failure recovery, malformed response, session cleanup');
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
