/**
 * Judith AI payment-inflows read-only widget.
 * Integration contract: loadPayments({month}) MUST call an authenticated server endpoint
 * that authorizes the Judith AI staff user and returns ONLY J.W. GmbH incoming payments.
 * Never query bank_transactions from a public client or expose balances/outgoing payments.
 */
export function mountJudithPaymentInflows(container, {loadPayments, saveReview}) {
  if (!(container instanceof HTMLElement) || typeof loadPayments !== 'function')
    throw new TypeError('Container and authorized loadPayments function required');
  container.replaceChildren();
  const title=document.createElement('h2');title.textContent='💳 Zahlungseingänge';
  const nav=document.createElement('div');nav.className='judith-pay-nav';
  const prev=document.createElement('button');prev.type='button';prev.textContent='◀';prev.setAttribute('aria-label','Vorheriger Monat');
  const month=document.createElement('input');month.type='month';
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Vienna'}).slice(0,7);
  month.value=today;
  month.setAttribute('aria-label','Monat direkt auswählen');
  const label=document.createElement('button');label.type='button';label.className='judith-pay-month';
  label.title='Monat auswählen';label.setAttribute('aria-label','Monat auswählen');
  const next=document.createElement('button');next.type='button';next.textContent='▶';next.setAttribute('aria-label','Nächster Monat');
  nav.append(prev,label,next,month);
  function displayMonth(){const [y,m]=month.value.split('-').map(Number);label.textContent=new Intl.DateTimeFormat('de-AT',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));next.disabled=month.value>=today;}
  function moveMonth(delta){const [y,m]=month.value.split('-').map(Number);const d=new Date(y,m-1+delta,1);const value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(value>today)return;month.value=value;refresh();}
  prev.addEventListener('click',()=>moveMonth(-1));
  next.addEventListener('click',()=>moveMonth(1));
  label.addEventListener('click',()=>{if(typeof month.showPicker==='function')month.showPicker();else month.focus();});
  const status=document.createElement('p');status.setAttribute('role','status');
  const list=document.createElement('div');
  const style=document.createElement('style');style.textContent=`
    .judith-pay-nav{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin:18px 0 22px}
    .judith-pay-nav>button{background:#b93470;color:#fff;border:0;border-radius:12px;min-width:48px;min-height:44px;font-size:18px;cursor:pointer}
    .judith-pay-nav>button:disabled{opacity:.35;cursor:default}
    .judith-pay-nav .judith-pay-month{min-width:195px;padding:10px 14px;font-size:17px;font-weight:750;text-transform:uppercase;background:#fff3f7;color:#8a315a;border:1px solid #efd2dd}
    .judith-pay-nav input{width:1px;height:1px;position:absolute;opacity:0;pointer-events:none}
    .judith-pay-table{width:100%;border-collapse:collapse;margin-top:16px;font-size:17px}
    .judith-pay-table th{text-align:left;font-weight:750;border-bottom:1px solid #d8d8d8;padding:12px 12px 14px}
    .judith-pay-table td{border-bottom:1px solid #ececec;padding:17px 12px;vertical-align:top}
    .judith-pay-table th:last-child,.judith-pay-table td:last-child{text-align:right;white-space:nowrap}
    .judith-pay-table strong{font-weight:800}
    .judith-pay-check{text-align:center!important;min-width:85px}
    .judith-pay-check input{width:22px;height:22px;accent-color:#278755;cursor:pointer}
    .judith-pay-checked{background:#f0faf3}
    .judith-pay-table .judith-pay-date{white-space:nowrap}
    @media(max-width:620px){.judith-pay-table{font-size:14px}.judith-pay-table td,.judith-pay-table th{padding:12px 5px}.judith-pay-table .judith-pay-date{white-space:normal}}

  `;
  container.append(style,title,nav,status,list);
  const money=new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'});
  let request=0;
  async function refresh(){
    const current=++request;list.replaceChildren();status.textContent='Lade Zahlungseingänge …';
    try {
      const rows=await loadPayments({month:month.value});
      if(current!==request)return;
      if(!Array.isArray(rows))throw Error('Ungültige Antwort');
      const safe=rows.filter(r=>r && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        r.date.startsWith(month.value) && Number.isFinite(r.amount) && r.amount>0);
      status.textContent=safe.length+' Zahlungseingänge'+(safe.some(r=>r.reviewAvailable===false)?' · Kontrollstatus derzeit nicht verfügbar':'');displayMonth();
      const table=document.createElement('table');table.className='judith-pay-table';
      const head=document.createElement('thead');const header=document.createElement('tr');
      for(const label of ['Datum · Rechnungsnummer','Kunde','Kontrolliert','Eingang']){const th=document.createElement('th');th.textContent=label;header.append(th)}
      head.append(header);table.append(head);
      const body=document.createElement('tbody');
      for(const row of safe){
        const tr=document.createElement('tr');
        const first=document.createElement('td');first.className='judith-pay-date';
        const date=document.createElement('span');date.textContent=row.date.slice(8,10)+'.'+row.date.slice(5,7)+'. · ';
        const invoice=document.createElement('strong');invoice.textContent=row.invoiceNumber||'Keine Rechnungsnummer';
        first.append(date,invoice);
        const name=document.createElement('td');name.textContent=row.name||'Unbekannt';
        const checkedCell=document.createElement('td');checkedCell.className='judith-pay-check';
        const checkbox=document.createElement('input');checkbox.type='checkbox';
        checkbox.checked=row.reviewed===true;
        checkbox.disabled=row.reviewAvailable===false;
        tr.classList.toggle('judith-pay-checked',checkbox.checked);
        checkbox.setAttribute('aria-label','Rechnung kontrolliert: '+(row.invoiceNumber||row.name||row.date));
        checkbox.addEventListener('change',async()=>{
          const desired=checkbox.checked;
          checkbox.disabled=true;
          try {
            await saveReview({id:row.id,reviewed:desired});
            tr.classList.toggle('judith-pay-checked',desired);
          } catch(_) {
            checkbox.checked=!desired;
            status.textContent='Kontrollstatus konnte nicht gespeichert werden.';
          } finally {checkbox.disabled=row.reviewAvailable===false}
        });
        checkedCell.append(checkbox);
        const amount=document.createElement('td');amount.textContent=money.format(row.amount);
        tr.append(first,name,checkedCell,amount);body.append(tr);
      }
      table.append(body);list.append(table);
    } catch(e) {
      if(current!==request)return;displayMonth();
      status.textContent='Zahlungseingänge derzeit nicht verfügbar.'+(e&&e.message?' ('+String(e.message).slice(0,180)+')':'');
    }
  }
  month.addEventListener('change',refresh);
  displayMonth();
  refresh();
  const onVisible=()=>{if(document.visibilityState==='visible'&&container.isConnected)refresh()};
  document.addEventListener('visibilitychange',onVisible);
  const timer=setInterval(()=>{if(document.visibilityState==='visible'&&container.isConnected)refresh()},60000);
  return {refresh, destroy(){request++;clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);container.replaceChildren()}};
}
