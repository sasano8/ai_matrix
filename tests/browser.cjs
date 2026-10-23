const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const point = (title) => ({ title, text: `${title}の本文` });
const analysis = (count = 3, depth = 3) => ({ topic: 'テスト話題', perspectives: Array.from({ length: count }, (_, i) => ({ title: `観点 ${i}`, points: Array.from({ length: depth }, (_, j) => point(`問い ${i}-${j}`)) })) });
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => { Object.defineProperty(window, 'LanguageModel', { configurable: true, value: undefined }); });
    await page.goto('http://127.0.0.1:8000');
    await page.waitForFunction(() => document.querySelector('#analyze').disabled);
    assert.equal(await page.locator('#guidance').isVisible(), false);
    assert.equal(await page.locator('#perspective-level').inputValue(), '3');
    assert.equal(await page.locator('#depth-level').inputValue(), '3');
    const proximity = await page.evaluate(() => {
      const action = document.querySelector('#analyze').getBoundingClientRect();
      const select = document.querySelector('#direction').getBoundingClientRect();
      return Math.abs(action.top - select.top) < 3;
    });
    assert.equal(proximity, true);
    await page.getByRole('button', { name: 'サンプルを見る' }).click();
    assert.equal(await page.locator('.column').count(), 3);
    assert.deepEqual(await page.locator('.column').evaluateAll((cols) => cols.map((c) => c.querySelectorAll('.card').length)), [2, 1, 3]);
    assert.equal(await page.locator('.card p, .card-index').count(), 0);
    assert.equal(await page.getByRole('button', { name: '標準', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: '詳細', exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => document.querySelector('.detail-pane').getBoundingClientRect().width > 600), true);
    await page.locator('.source summary').click();
    assert.match(await page.locator('.source p').innerText(), /リモートワーク/);
    await page.locator('.column').nth(2).locator('.card').nth(1).click();
    await page.getByRole('button', { name: 'ページを編集' }).click();
    await page.locator('#edit-topic').fill('自分にとって大切な働き方');
    await page.locator('#edit-perspective').fill('自分の価値観');
    await page.locator('#edit-title').fill('何を大切にしたい？');
    await page.locator('#edit-text').fill('どんなときに、自分らしくいられる？');
    await page.locator('#edit-notes').fill('自分で選べる余白を大切にしたい。');
    await page.getByRole('button', { name: '変更を保存' }).click();
    assert.equal(await page.locator('.topic h2').innerText(), '自分にとって大切な働き方');
    assert.equal(await page.locator('.column h3').nth(2).innerText(), '自分の価値観');
    assert.match(await page.locator('.personal-notes').innerText(), /余白/);
    await page.getByRole('button', { name: 'ページを編集' }).click();
    await page.locator('#edit-title').fill('未保存の変更');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.locator('.card').first().click();
    assert.equal(await page.locator('#edit-title').inputValue(), '未保存の変更');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
    assert.equal(await page.locator('#detail h2').innerText(), '何を大切にしたい？');
    const titles = await page.locator('.card h4').allTextContents();
    await page.getByRole('button', { name: 'ロングテール', exact: true }).focus();
    assert.match(await page.locator('#sort-explanation').innerText(), /少数の観点/);
    await page.getByRole('button', { name: 'プライオリティ', exact: true }).click();
    assert.match(await page.locator('#sort-explanation').innerText(), /重要度を合計/);
    assert.deepEqual(await page.locator('.card h4').allTextContents(), titles);
    assert.equal(await page.locator('#detail h2').innerText(), '何を大切にしたい？');
    await page.locator('#deepen-1').fill('通知を減らすには？');
    await page.locator('.column').nth(1).getByRole('button', { name: '深掘りする' }).click();
    assert.equal(await page.locator('.card').count(), 7);
    await page.locator('#widen-request').fill('まだ触れていないこと');
    await page.getByRole('button', { name: '視野を広げる' }).click();
    assert.equal(await page.locator('.column').count(), 4);
    assert.equal(await page.locator('.card').count(), 8);
    await page.reload();
    assert.equal(await page.locator('.card').count(), 8);
    await page.locator('.column').nth(2).locator('.card').nth(1).click();
    assert.match(await page.locator('.personal-notes').innerText(), /余白/);
    // Time is a four-phase cycle, not an ever-growing history.
    const baselineTitles = await page.locator('.card h4').allTextContents();
    await page.locator('#post').fill('基準時点の下書き');
    const baseLabel = await page.locator('#time-label').innerText();
    await page.locator('#time-travel').click({ button: 'right' });
    assert.match(await page.locator('#time-label').innerText(), /3か月/);
    assert.deepEqual(await page.locator('.card h4').allTextContents(), baselineTitles);
    await page.getByRole('button', { name: 'ページを編集' }).click();
    await page.locator('#edit-title').fill('3か月先だけの見出し');
    await page.getByRole('button', { name: '変更を保存' }).click();
    await page.locator('#post').fill('3か月先の下書き');
    await page.locator('#time-travel').click();
    assert.equal(await page.locator('#time-label').innerText(), baseLabel);
    assert.deepEqual(await page.locator('.card h4').allTextContents(), baselineTitles);
    assert.equal(await page.locator('#post').inputValue(), '基準時点の下書き');
    await page.locator('#time-forward').click();
    assert.match(await page.locator('#detail h2').innerText(), /3か月先だけ/);
    assert.equal(await page.locator('#post').inputValue(), '3か月先の下書き');
    await page.reload();
    assert.match(await page.locator('#time-label').innerText(), /3か月/);
    assert.match(await page.locator('#detail h2').innerText(), /3か月先だけ/);
    await page.locator('#time-back').click();
    for (let i = 0; i < 4; i++) await page.locator('#time-travel').click({ button: 'right' });
    assert.equal(await page.locator('#time-label').innerText(), baseLabel);
    assert.deepEqual(await page.locator('.card h4').allTextContents(), baselineTitles);
    for (let i = 0; i < 4; i++) await page.locator('#time-travel').click();
    assert.equal(await page.locator('#time-label').innerText(), baseLabel);
    await page.locator('#time-travel').focus();
    await page.keyboard.press('ArrowRight');
    assert.match(await page.locator('#time-label').innerText(), /3か月/);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#time-label').innerText(), baseLabel);
    await page.getByRole('button', { name: 'ページを編集' }).click();
    await page.locator('#edit-title').fill('時間移動前の未保存変更');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.locator('#time-forward').click();
    assert.equal(await page.locator('#time-label').innerText(), baseLabel);
    assert.equal(await page.locator('#edit-title').inputValue(), '時間移動前の未保存変更');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
    await page.evaluate(() => { window.scrollTo(0, 0); });
    await page.screenshot({ path: '/tmp/ai-matrix-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#prompt-settings summary').click();
    const panel = await page.locator('.prompt-panel').boundingBox();
    assert.equal(panel.x >= 0 && panel.x + panel.width <= 390, true);
    await page.locator('#prompt-settings summary').click();
    await page.screenshot({ path: '/tmp/ai-matrix-mobile.png', fullPage: true });
    console.log('PASS: compact controls, heading-only matrix, editing, persistence, unsaved changes, independent deepening, widening, sort explanations, responsive layout');

    const ai = await browser.newPage();
    ai.on('pageerror', (error) => errors.push(error.message));
    await ai.addInitScript(() => {
      localStorage.clear();
      window.calls = [];
      window.queue = [];
      window.destroyed = 0;
      window.LanguageModel = {
        availability: async () => 'available',
        create: async (options) => {
          window.calls.push({ kind: 'create', options });
          return {
            prompt: async (prompt, config) => {
              if (config.responseConstraint) throw new Error('grm ERROR: Not supported in app messages from Iterable');
              window.calls.push({ kind: 'prompt', prompt, hasConstraint: 'responseConstraint' in config });
              const action = window.queue.shift();
              if (action?.type === 'throw') throw new Error('simulated failure');
              if (action?.type === 'hang') return new Promise(() => {});
              if (action?.type === 'return') return action.value;
              const schema = JSON.parse(prompt.split('説明や Markdown は付けないでください。\n').at(-1));
              const point = (title) => ({ title, text: '本文\n改行を保持' });
              return JSON.stringify(schema.type === 'array' ? [point('追加 A'), point('追加 B'), point('追加 C')] : {
                topic: 'テスト話題', perspectives: Array.from({ length: 3 }, (_, i) => ({ title: `観点 ${i}`, points: Array.from({ length: 3 }, (_, j) => point(`問い ${i}-${j}`)) })),
              });
            },
            destroy: () => { window.destroyed++; },
          };
        },
      };
    });
    await ai.goto('http://127.0.0.1:8000');
    await ai.waitForFunction(() => !document.querySelector('#analyze').disabled);
    const enqueue = async (...responses) => ai.evaluate((values) => { window.queue.push(...values.map((value) => ({ type: 'return', value: typeof value === 'string' ? value : JSON.stringify(value) }))); }, responses);
    const idle = async () => ai.waitForFunction(() => !document.querySelector('#analyze').disabled);
    await ai.locator('#post').fill('自分にとっての働き方を考えたい');
    const sparse = analysis(2, 1);
    const extra = analysis();
    extra.perspectives[0].points.shift(); extra.perspectives[1].points.shift();
    await enqueue(sparse, extra);
    await ai.locator('#analyze').click(); await idle();
    assert.equal(await ai.locator('.column').count(), 3);
    assert.equal(await ai.locator('.card').count(), 9);
    let prompts = await ai.evaluate(() => window.calls.filter((c) => c.kind === 'prompt'));
    assert.equal(prompts.length, 2);
    assert.equal(prompts.every((c) => !c.hasConstraint), true);
    assert.match(prompts[0].prompt, /観点は3件、各観点の深掘りは3件/);
    assert.match(prompts[0].prompt, /問いだけ/);
    await ai.getByRole('button', { name: 'ページを編集' }).click();
    await ai.locator('#edit-notes').fill('自分で計画を立てたい');
    await ai.getByRole('button', { name: '変更を保存' }).click();
    await ai.locator('#deepen-0').fill('自分の言葉で考えたい');
    await enqueue([point('追加 1')], [point('追加 2'), point('追加 3')]);
    await ai.locator('.column').first().getByRole('button', { name: '深掘りする' }).click(); await idle();
    assert.equal(await ai.locator('.card').count(), 12);
    prompts = await ai.evaluate(() => window.calls.filter((c) => c.kind === 'prompt'));
    assert.match(prompts[2].prompt, /自分で計画を立てたい/);
    const fresh = analysis(3, 3);
    fresh.perspectives.forEach((p, i) => { p.title = `新しい観点 ${i}`; });
    await enqueue(fresh);
    await ai.getByRole('button', { name: '視野を広げる' }).click(); await idle();
    assert.equal(await ai.locator('.column').count(), 6);
    assert.equal(await ai.locator('.card').count(), 21);
    // Empty additions are valid and never create blank cards or discard the matrix.
    await enqueue([], []);
    await ai.locator('.column').first().getByRole('button', { name: '深掘りする' }).click(); await idle();
    assert.equal(await ai.locator('.card').count(), 21);
    // Excess output must remain; this also checks fenced JSON and text-only rendering.
    const large = analysis(6, 5); large.perspectives[0].points[0].title = '<img src=x onerror=alert(1)>';
    await enqueue('```json\n' + JSON.stringify(large) + '\n```');
    await ai.locator('#analyze').click(); await idle();
    assert.equal(await ai.locator('.column').count(), 6);
    assert.equal(await ai.locator('.card').count(), 30);
    assert.equal(await ai.locator('#matrix img, #detail img').count(), 0);
    // Choose a real prompt template; it is editable and applies to generation.
    await ai.locator('#direction').selectOption('plan');
    await ai.locator('#analyze').click(); await idle();
    prompts = await ai.evaluate(() => window.calls.filter((c) => c.kind === 'prompt'));
    assert.match(prompts.at(-1).prompt, /実行可能な行動/);
    assert.doesNotMatch(prompts.at(-1).prompt, /問いだけ/);
    await ai.locator('#direction').selectOption('custom');
    await ai.locator('#guidance').fill('異なる立場を対比してください');
    await ai.locator('#analyze').click(); await idle();
    prompts = await ai.evaluate(() => window.calls.filter((c) => c.kind === 'prompt'));
    assert.match(prompts.at(-1).prompt, /異なる立場を対比/);
    // Malformed JSON is retried once; schema-invalid JSON is shown as an error.
    await enqueue('not JSON', analysis());
    await ai.locator('#analyze').click(); await idle();
    assert.equal(await ai.locator('.card').count(), 9);
    await enqueue({ invalid: true });
    await ai.locator('#analyze').click(); await idle();
    assert.equal(await ai.locator('#error').isVisible(), true);
    assert.equal(await ai.locator('.card').count(), 9);
    // A model that ignores AbortSignal must still release the UI on cancellation.
    await ai.evaluate(() => { window.queue.push({ type: 'hang' }); });
    await ai.locator('#analyze').click();
    await ai.waitForFunction(() => window.calls.at(-1)?.kind === 'prompt');
    assert.equal(await ai.locator('#time-travel').isDisabled(), true);
    await ai.locator('#cancel-generation').click(); await idle();
    assert.match(await ai.locator('#error').innerText(), /中止/);
    assert.equal(await ai.locator('.card').count(), 9);
    // No possible perspectives is a valid result, including after one completion attempt.
    await enqueue({ topic: 'まだ形にならない話題', perspectives: [] }, { topic: 'まだ形にならない話題', perspectives: [] });
    await ai.locator('#analyze').click(); await idle();
    assert.equal(await ai.locator('.card').count(), 0);
    assert.match(await ai.locator('.no-points').innerText(), /観点はまだ見つかりません/);
    assert.equal(await ai.locator('#error').isVisible(), false);
    assert.equal(await ai.locator('#detail h2').innerText(), 'ひとつの気づきに、\nフォーカスする。');
    await enqueue(analysis());
    await ai.getByRole('button', { name: '視野を広げる' }).click(); await idle();
    assert.equal(await ai.locator('.card').count(), 9);
    assert.deepEqual(errors, []);
    // Existing single-matrix data remains readable and is not removed by migration.
    const legacy = await browser.newPage();
    await legacy.addInitScript((matrix) => {
      if (!sessionStorage.getItem('legacy-seeded')) {
        localStorage.clear();
        localStorage.setItem('ai-matrix-v1', JSON.stringify({ ...matrix, source: '旧バージョンの投稿', demo: false, direction: 'reflect' }));
        sessionStorage.setItem('legacy-seeded', 'true');
      }
      Object.defineProperty(window, 'LanguageModel', { configurable: true, value: undefined });
    }, analysis());
    await legacy.goto('http://127.0.0.1:8000');
    assert.equal(await legacy.locator('.card').count(), 9);
    await legacy.locator('#time-forward').click();
    await legacy.reload();
    assert.equal(await legacy.locator('.card').count(), 9);
    assert.match(await legacy.locator('#time-label').innerText(), /3か月/);
    assert.equal(await legacy.evaluate(() => Boolean(localStorage.getItem('ai-matrix-v1'))), true);
    assert.deepEqual(errors, []);
    console.log('PASS: time cycle, both directions, independent edits and drafts, reload, keyboard, unsaved changes, busy state, legacy migration');
    console.log('PASS: plain Prompt API without grammar constraints, JSON repair, completion to 3×3, excess and empty results, prompt selection, edited context, horizontal expansion, cancellation, XSS safety');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
