import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const source = await readFile('index.html', 'utf8');
const recipeLoader = source.slice(source.indexOf('async function loadJudithRecipes(){'), source.indexOf('const JUDITH_ARTICLE_BUSINESS='));
const css = source.match(/<style id="judith-purchase-advisor-style">([\s\S]*?)<\/style>/)[1];
const module = await readFile('judith-purchase-advisor.mjs', 'utf8');
const browser = await chromium.launch({headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({viewport: {width, height: 900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
    await page.route('https://fixture.local/**', route => {
      if (route.request().url().endsWith('.mjs')) return route.fulfill({contentType: 'text/javascript', body: module});
      return route.fulfill({contentType: 'text/html', body: '<style>body{margin:8px}*{box-sizing:border-box}' + css + '</style><body data-active-business="judith"><button id="open">Rezepte & Kalkulation</button><details id="recipeCostTile" open><div><div id="recipeCostRows"></div></div></details></body>'});
    });
    await page.goto('https://fixture.local/');
    await page.evaluate(async ({recipeLoader}) => {
      const {JUDITH, loadPurchaseAdvisor} = await import('/judith-purchase-advisor.mjs');
      const catalog = [{id: 'c', business_id: JUDITH, name: 'Zucker <img src=x>', canonical_unit: 'kg', current_price_net: 3, price_date: '2026-11-20', price_supplier: 'A'}];
      const recipes = [{id: 'r', business_id: JUDITH, name: 'Torte', yield_qty: 1, yield_unit: 'Torte', setup_percent: 0}];
      const lines = [{id: 'i', recipe_id: 'r', ingredient_name: 'Zucker', quantity: 250, unit: 'g', matched_ingredient_id: 'c'}];
      const history = [{id: 'h1', business_id: JUDITH, ingredient_id: 'c', price_net: 2, unit: 'kg', document_date: '2026-10-01', supplier: 'A'}, {id: 'h2', business_id: JUDITH, ingredient_id: 'c', price_net: 1.8, unit: 'kg', document_date: '2026-10-01', supplier: 'B'}];
      window.queries = [];
      const data = {gp_ingredient_catalog: catalog, gp_recipes: recipes, gp_recipe_ingredients: lines, gp_ingredient_price_history: history};
      const db = {from(table) {
        const filters = [];
        let paged = false;
        const query = {select() {return query;}, eq(key, value) {filters.push([key, value]); return query;},
          in() {return query;}, order() {return query;}, range() {paged = true; return query;},
          then(resolve) {window.queries.push({table, filters, paged}); const rows = data[table].filter(row => filters.every(([key, value]) => row[key] === value)); return Promise.resolve({data: rows, error: null}).then(resolve);}};
        return query;
      }};
      window.BID = JUDITH;
      const E = id => document.getElementById(id);
      const EUR = n => String(n ?? '–');
      const fn = new Function('db', 'E', 'EUR', 'loadPurchaseAdvisor', recipeLoader + '; return loadJudithRecipes;')(db, E, EUR, loadPurchaseAdvisor);
      document.getElementById('open').onclick = () => fn();
      window.testSwitch = async () => {
        const count = window.queries.length;
        window.BID = 'friedrich';
        await loadPurchaseAdvisor(db, 'friedrich', document.body, () => window.BID);
        return window.queries.length === count;
      };
    }, {recipeLoader});
    await page.locator('#open').click();
    await page.locator('#judithPurchaseAdvisor [role=status]').filter({hasText: '1 Zutaten'}).waitFor();
    assert.equal(await page.locator('#recipeCostRows>.tile').count(), 1);
    assert.equal(await page.locator('#judithPurchaseAdvisor img').count(), 0);
    await page.locator('.judith-purchase-item>summary').click();
    assert.match(await page.locator('#judithPurchaseAdvisor').innerText(), /Belegte Lieferantenpreise/);
    // Conflicting predecessors remain visibly incomplete.
    assert.match(await page.locator('#judithPurchaseAdvisor').innerText(), /noch unvollständig/);
    await page.getByRole('searchbox').fill('NICHT VORHANDEN');
    assert.equal(await page.locator('.judith-purchase-item').count(), 0);
    await page.getByRole('searchbox').fill('zucker');
    assert.equal(await page.locator('.judith-purchase-item').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.evaluate(() => window.queries.filter(q => q.paged && q.table !== 'gp_recipe_ingredients').every(q => q.filters.some(([key, value]) => key === 'business_id' && value === window.BID))), true);
    assert.equal(await page.evaluate(() => window.testSwitch()), true);
    assert.equal(await page.locator('#judithPurchaseAdvisor').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Passed ' + width + 'px: existing recipe loader, advisor, search, supplier evidence, incomplete impacts, text escaping, business isolation');
    await page.close();
  }
} finally {
  await browser.close();
}
