import test from 'node:test';
import assert from 'node:assert/strict';
import {JUDITH, buildPurchaseAdvice, convertPrice} from '../judith-purchase-advisor.mjs';

const today = '2026-11-21';
const item = {id: 'sugar', business_id: JUDITH, name: 'Zucker', canonical_unit: 'kg', current_price_net: 3, price_date: '2026-11-20', price_supplier: 'Lieferant A'};
const historyRow = {business_id: JUDITH, ingredient_id: 'sugar', price_net: 2, unit: 'kg', document_date: '2026-10-10', supplier: 'Lieferant A'};
const advice = (extra = {}, catalog = [item]) => buildPurchaseAdvice({catalog, history: [historyRow], ...extra}, today);

test('converts only compatible quantity units without inferring a package', () => {
  assert.equal(convertPrice(3, 'kg', 'g'), 0.003);
  assert.equal(convertPrice(0.003, 'g', 'kg'), 3);
  assert.equal(convertPrice(3, 'L', 'ml'), 0.003);
  for (const unit of ['KT', 'PK', 'Stück', 'l']) assert.equal(convertPrice(3, unit, 'kg'), null);
  for (const value of [null, '', 0, -1, Infinity]) assert.equal(convertPrice(value, 'kg', 'kg'), null);
});

test('isolates Judith data including recipes and history', () => {
  const rows = advice({history: [{...historyRow, business_id: 'friedrich'}], recipes: [{id: 'r', business_id: 'friedrich'}]}, [item, {...item, business_id: 'friedrich'}]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].previous, null);
  assert.deepEqual(rows[0].impacts, []);
});

test('compares latest dated price to the preceding date', () => {
  const row = advice({history: [historyRow, {...historyRow, document_date: '2026-11-20', price_net: 3}]})[0];
  assert.equal(row.changePercent, 50);
  assert.equal(row.change, 1);
});

test('does not choose among conflicting preceding prices', () => {
  const row = advice({history: [historyRow, {...historyRow, price_net: 2.2}]})[0];
  assert.equal(row.previous, null);
  assert.equal(row.changePercent, null);
});

test('deduplicates equivalent historic prices and compatible units', () => {
  const row = advice({history: [historyRow, {...historyRow, unit: 'g', price_net: 0.002}]})[0];
  assert.equal(row.previous, 2);
});

test('uses the most recent observation for each supplier, with its actual date', () => {
  const row = advice({history: [historyRow,
    {...historyRow, document_date: '2026-11-01', price_net: 4},
    {...historyRow, supplier: 'Lieferant B', price_net: 3.5}]})[0];
  assert.equal(row.suppliers.length, 2);
  assert.equal(row.suppliers[0].name, 'Lieferant B');
  assert.equal(row.suppliers[1].price, 4);
});

test('omits ambiguous supplier quotes on the same date', () => {
  assert.equal(advice({history: [historyRow, {...historyRow, price_net: 2.2}]})[0].suppliers.length, 0);
});

test('excludes future history, undated prices and wrong dimensions', () => {
  const row = advice({history: [{...historyRow, document_date: '2027-01-01'}, {...historyRow, document_date: null}, {...historyRow, unit: 'l'}]})[0];
  assert.equal(row.previous, null);
  assert.deepEqual(row.suppliers, []);
  assert.equal(advice({}, [{...item, price_date: '2027-01-01'}])[0].current, null);
});

test('calculates cost changes for the entire recipe with units and setup', () => {
  const row = advice({recipes: [{id: 'r', business_id: JUDITH, name: 'Torte', yield_qty: 2, yield_unit: 'Torten', setup_percent: 10}],
    ingredients: [{recipe_id: 'r', matched_ingredient_id: 'sugar', quantity: 250, unit: 'g'}]})[0];
  assert.equal(row.impacts[0].delta, 0.275);
  assert.equal(row.impacts[0].yieldQty, 2);
});

test('marks incompatible and missing recipe costs incomplete', () => {
  const base = {recipes: [{id: 'r', business_id: JUDITH}], ingredients: [{recipe_id: 'r', matched_ingredient_id: 'sugar', quantity: 1, unit: 'Stück'}]};
  assert.equal(advice(base)[0].impacts[0].delta, null);
  base.ingredients[0].unit = 'kg';
  assert.equal(advice({...base, history: []})[0].impacts[0].delta, null);
});

test('recognizes price decreases and aged prices', () => {
  const row = advice({}, [{...item, current_price_net: 1, price_date: '2026-07-01'}]);
  assert.equal(row[0].stale, true);
  assert.equal(advice({}, [{...item, current_price_net: 1}])[0].changePercent, -50);
});
