export const JUDITH = '87889eaf-f865-4e3a-8f9a-cd01db483e0e';

const units = {
  kg: ['mass', 1], g: ['mass', 0.001],
  l: ['volume', 1], liter: ['volume', 1], ml: ['volume', 0.001],
  'stück': ['piece', 1], stk: ['piece', 1], st: ['piece', 1]
};

function positive(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function convertPrice(price, from, to) {
  const source = units[String(from).trim().toLowerCase()];
  const target = units[String(to).trim().toLowerCase()];
  const value = positive(price);
  if (!value || !source || !target || source[0] !== target[0]) return null;
  return value * target[1] / source[1];
}

function validDate(date, today) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date || '') && date <= today;
}

function supplierKey(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de-AT');
}

export function buildPurchaseAdvice({catalog = [], history = [], recipes = [], ingredients = []}, today) {
  const judithRecipes = recipes.filter(recipe => recipe.business_id === JUDITH);
  return catalog.filter(item => item.business_id === JUDITH).map(item => {
    const observations = history.filter(row => row.business_id === JUDITH && row.ingredient_id === item.id)
      .filter(row => validDate(row.document_date, today) && positive(row.price_net))
      .map(row => ({...row, price: convertPrice(row.price_net, row.unit, item.canonical_unit)}))
      .filter(row => row.price !== null)
      .sort((a, b) => b.document_date.localeCompare(a.document_date));
    const current = validDate(item.price_date, today) ? positive(item.current_price_net) : null;
    // The same day's conflicting prices cannot establish a reliable predecessor.
    const priorDate = observations.find(row => row.document_date < item.price_date)?.document_date;
    const priorRows = observations.filter(row => row.document_date === priorDate);
    const priorPrices = [...new Set(priorRows.map(row => row.price.toFixed(8)))];
    const previous = priorPrices.length === 1 ? priorRows[0].price : null;
    const change = current !== null && previous !== null ? current - previous : null;
    const suppliers = [];
    const keys = [...new Set(observations.map(row => supplierKey(row.supplier)).filter(Boolean))];
    for (const key of keys) {
      const rows = observations.filter(row => supplierKey(row.supplier) === key);
      const latest = rows.filter(row => row.document_date === rows[0].document_date);
      if (new Set(latest.map(row => row.price.toFixed(8))).size !== 1) continue;
      suppliers.push({name: rows[0].supplier, price: rows[0].price, date: rows[0].document_date});
    }
    suppliers.sort((a, b) => a.price - b.price);
    const impacts = [];
    for (const recipe of judithRecipes) {
      const lines = ingredients.filter(line => line.recipe_id === recipe.id && line.matched_ingredient_id === item.id);
      if (!lines.length) continue;
      let delta = 0;
      let complete = change !== null;
      for (const line of lines) {
        const quantity = positive(line.quantity);
        const before = convertPrice(previous, item.canonical_unit, line.unit);
        const after = convertPrice(current, item.canonical_unit, line.unit);
        if (!quantity || before === null || after === null) { complete = false; continue; }
        delta += quantity * (after - before);
      }
      const setup = Number(recipe.setup_percent ?? 0);
      if (!Number.isFinite(setup) || setup < 0) complete = false;
      impacts.push({name: recipe.name, yieldQty: recipe.yield_qty, yieldUnit: recipe.yield_unit,
        delta: complete ? delta * (1 + setup / 100) : null});
    }
    return {id: item.id, name: item.name, unit: item.canonical_unit, current, previous,
      date: item.price_date, supplier: item.price_supplier, priorDate, change,
      changePercent: change === null ? null : change / previous * 100,
      stale: validDate(item.price_date, today) && Date.parse(today) - Date.parse(item.price_date) > 90 * 86400000,
      suppliers, impacts};
  }).sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity) || a.name.localeCompare(b.name, 'de'));
}

const money = value => value === null ? '–' : new Intl.NumberFormat('de-AT', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4
}).format(value);
const dateText = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('.') : '–';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function renderPurchaseAdvice(host, rows) {
  host.replaceChildren();
  host.append(element('h3', 'Einkaufsberater'));
  const search = element('input');
  search.type = 'search';
  search.placeholder = 'Zutat oder Lieferant suchen';
  search.setAttribute('aria-label', 'Zutat oder Lieferant suchen');
  host.append(search);
  const status = element('p', '', 'muted');
  status.setAttribute('role', 'status');
  host.append(status);
  const list = element('div');
  host.append(list);
  const draw = () => {
    list.replaceChildren();
    const query = search.value.trim().toLocaleLowerCase('de-AT');
    const visible = rows.filter(row => [row.name, row.supplier, ...row.suppliers.map(s => s.name)]
      .join(' ').toLocaleLowerCase('de-AT').includes(query));
    status.textContent = visible.length + ' Zutaten · Netto-EK je kg, Liter oder Stück';
    if (!visible.length) { list.append(element('p', 'Keine passenden Zutaten vorhanden.')); return; }
    for (const row of visible) {
      const card = element('details', undefined, 'judith-purchase-item');
      const summary = element('summary');
      summary.append(element('strong', row.name), element('span', money(row.current) + ' / ' + row.unit));
      let label = 'Vergleichspreis fehlt';
      if (row.changePercent !== null) {
        label = (row.changePercent > 0 ? '+' : '') + row.changePercent.toLocaleString('de-AT', {maximumFractionDigits: 1}) + ' %';
      }
      const change = element('span', label);
      if (row.change > 0) change.style.color = '#a22238';
      if (row.change < 0) change.style.color = '#216644';
      summary.append(change);
      card.append(summary);
      card.append(element('p', (row.supplier || 'Lieferant fehlt') + ' · Preisstand ' + dateText(row.date) + (row.stale ? ' · älter als 90 Tage' : '')));
      if (row.previous !== null) {
        card.append(element('p', 'Vorher ' + money(row.previous) + ' / ' + row.unit + ' am ' + dateText(row.priorDate)));
      }
      if (row.suppliers.length > 1) {
        card.append(element('h4', 'Belegte Lieferantenpreise'));
        for (const supplier of row.suppliers) {
          card.append(element('p', supplier.name + ' · ' + money(supplier.price) + ' / ' + row.unit + ' · ' + dateText(supplier.date)));
        }
        card.append(element('small', 'Letzter gespeicherter Einkauf je Lieferant. Verfügbarkeit, Versand und aktuelle Angebote bitte berücksichtigen.'));
      } else {
        card.append(element('p', 'Für einen Lieferantenvergleich fehlen weitere belegte Preise dieser Zutat.'));
      }
      if (row.impacts.length) {
        card.append(element('h4', 'Auswirkung auf Rezeptkosten'));
        for (const impact of row.impacts) {
          const delta = impact.delta === null ? 'noch unvollständig' : (impact.delta > 0 ? '+' : '') + money(impact.delta);
          card.append(element('p', impact.name + ' · ' + delta + ' je Rezeptansatz (' + impact.yieldQty + ' ' + impact.yieldUnit + ')'));
        }
        card.append(element('small', 'Änderung durch diese Zutat einschließlich hinterlegtem Rezeptaufschlag.'));
      }
      list.append(card);
    }
  };
  search.addEventListener('input', draw);
  draw();
}

async function readAll(db, table, columns, businessId) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const {data, error} = await db.from(table).select(columns).eq('business_id', businessId)
      .order('id').range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

let requestId = 0;
export async function loadPurchaseAdvisor(db, businessId, container, getBusinessId) {
  const request = ++requestId;
  const existing = document.getElementById('judithPurchaseAdvisor');
  if (businessId !== JUDITH) { existing?.remove(); return; }
  let host = existing;
  if (!host) {
    host = element('section');
    host.id = 'judithPurchaseAdvisor';
    host.setAttribute('aria-label', 'Einkaufsberater Judith');
    container.prepend(host);
  }
  host.textContent = 'Einkaufspreise werden geladen …';
  try {
    const [catalog, history, recipes] = await Promise.all([
      readAll(db, 'gp_ingredient_catalog', 'id,business_id,name,canonical_unit,current_price_net,price_date,price_supplier', JUDITH),
      readAll(db, 'gp_ingredient_price_history', 'id,business_id,ingredient_id,supplier,price_net,unit,document_date,document_id', JUDITH),
      readAll(db, 'gp_recipes', 'id,business_id,name,yield_qty,yield_unit,setup_percent', JUDITH)
    ]);
    const ingredients = [];
    for (const recipe of recipes) {
      for (let offset = 0; ; offset += 1000) {
        const {data, error} = await db.from('gp_recipe_ingredients')
          .select('id,recipe_id,quantity,unit,matched_ingredient_id').eq('recipe_id', recipe.id)
          .order('id').range(offset, offset + 999);
        if (error) throw error;
        ingredients.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
    }
    if (request !== requestId || getBusinessId() !== JUDITH) return;
    const today = new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Vienna'}).format(new Date());
    renderPurchaseAdvice(host, buildPurchaseAdvice({catalog, history, recipes, ingredients}, today));
  } catch (error) {
    if (request !== requestId || getBusinessId() !== JUDITH) return;
    host.textContent = 'Einkaufsberater konnte nicht geladen werden. Bitte erneut aktualisieren.';
    console.warn('Judith Einkaufsberater', error);
  }
}
