/* GastroPilot Founder v1 — read-only management insights.
   Usage: import { renderFounder } from './founder.js';
   renderFounder(document.getElementById('founder'), { friedrich: {...}, judith: {...} });
   All monetary amounts in EUR; gross revenue explicitly marked. No automatic postings.
*/
const euro = n => Number.isFinite(n) ? new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n) : 'Keine Daten';
const safe = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function analyze(label, data) {
  const d = data || {};
  const revenue = Number.isFinite(d.revenueGross) ? d.revenueGross : null;
  const target = Number.isFinite(d.targetGross) && d.targetGross > 0 ? d.targetGross : null;
  const personnel = Number.isFinite(d.personnelCost) ? d.personnelCost : null;
  const purchasing = Number.isFinite(d.purchaseCost) ? d.purchaseCost : null;
  const percent = revenue !== null && target !== null ? 100 * revenue / target : null;
  const notes = [];
  if (revenue === null) notes.push('Tagesabschlüsse/Umsatz fehlen – keine Umsatzprognose.');
  if (target === null) notes.push('Sollumsatz nicht hinterlegt.');
  if (personnel === null) notes.push('Personalkosten nicht vollständig vorhanden.');
  if (purchasing === null) notes.push('Einkaufsbelege fehlen oder sind unvollständig – Wareneinsatz nicht berechenbar.');
  else notes.push('Einkäufe sind nicht automatisch Wareneinsatz: Lagerveränderungen fehlen möglicherweise.');
  if (percent !== null && percent < 80) notes.push('Umsatzziel aktuell unter 80 %; Monatsfortschritt und Buchungsstand prüfen.');
  return {label,revenue,target,percent,personnel,purchasing,notes,asOf:d.asOf || null};
}
export function renderFounder(root, data = {}) {
  if (!root) throw new Error('Founder container fehlt');
  const businesses = [
    analyze('Das Friedrich', data.friedrich),
    analyze('Judith und die Torten', data.judith)
  ];
  root.innerHTML = `<section class="founder" aria-label="Founder Managementanalyse">
  <style>
  .founder{font:14px/1.5 system-ui,sans-serif;color:#172a3a;background:#fff;border:1px solid #e5eaf0;border-radius:16px;padding:18px}
  .founder h2{margin:0 0 5px;font-size:20px}.founder .hint{color:#64748b;font-size:12px}
  .founder .companies{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;margin-top:14px}
  .founder article{background:#f8fafc;border:1px solid #e5eaf0;border-radius:12px;padding:14px}
  .founder h3{margin:0 0 12px}.founder dl{display:grid;grid-template-columns:1fr auto;gap:6px;margin:0}
  .founder dt{color:#526475}.founder dd{margin:0;font-weight:700;text-align:right}
  .founder ul{padding-left:18px;color:#854d0e;font-size:12px}
  @media(max-width:600px){.founder{padding:12px}}
  </style>
  <h2>Founder · Unternehmenssteuerung</h2>
  <div class="hint">Nur lesende Analyse · Betriebe getrennt · Keine automatischen Buchungen</div>
  <div class="companies">${businesses.map(b=>`<article>
    <h3>${safe(b.label)}</h3>
    <dl><dt>Umsatz brutto</dt><dd>${euro(b.revenue)}</dd>
    <dt>Sollumsatz brutto</dt><dd>${euro(b.target)}</dd>
    <dt>Zielerreichung</dt><dd>${b.percent===null?'Keine Daten':b.percent.toFixed(1).replace('.',',')+' %'}</dd>
    <dt>Personalkosten</dt><dd>${euro(b.personnel)}</dd>
    <dt>Einkäufe (kein Wareneinsatz)</dt><dd>${euro(b.purchasing)}</dd></dl>
    <p class="hint">Datenstand: ${safe(b.asOf || 'Nicht angegeben')}</p>
    <strong>Founder-Hinweise</strong><ul>${(b.notes.length?b.notes:['Keine Auffälligkeit anhand der verfügbaren Kennzahlen.']).map(n=>`<li>${safe(n)}</li>`).join('')}</ul>
  </article>`).join('')}</div></section>`;
  return businesses;
}
