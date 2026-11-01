/**
 * Judith AI payment-inflows read-only widget.
 * Integration contract: loadPayments({month}) MUST call an authenticated server endpoint
 * that authorizes the Judith AI staff user and returns ONLY J.W. GmbH incoming payments.
 * Never query bank_transactions from a public client or expose balances/outgoing payments.
 */
export function mountJudithPaymentInflows(container, {loadPayments}) {
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
    .judith-payment-row{background:#fff;border:1px solid #efd8e0;border-radius:12px;padding:14px 16px;margin:10px 0;display:flex;align-items:center;gap:6px 12px;flex-wrap:wrap}
    .judith-payment-row .judith-pay-invoice{font-weight:800;color:#aa2d65}
    .judith-payment-row .judith-pay-name{flex-basis:100%;color:#57414d;overflow-wrap:anywhere}
    .judith-payment-row .judith-pay-amount{margin-left:auto;font-weight:750;color:#4a3340}
    @media(max-width:540px){.judith-pay-nav{gap:7px}.judith-pay-nav .judith-pay-month{min-width:155px;font-size:14px}.judith-payment-row .judith-pay-amount{margin-left:0}}
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
      status.textContent=safe.length+' Zahlungseingänge';displayMonth();
      for(const row of safe){
        const item=document.createElement('div');item.className='judith-payment-row';
        const date=document.createElement('span');
        date.textContent=row.date.slice(8,10)+'.'+row.date.slice(5,7)+'.'+row.date.slice(0,4)+' ';
        const invoice=document.createElement('strong');
        invoice.className='judith-pay-invoice';invoice.textContent=row.invoiceNumber||'Keine Rechnungsnummer';
        const name=document.createElement('span');name.className='judith-pay-name';name.textContent=row.name||'Unbekannt';
        const amount=document.createElement('span');amount.className='judith-pay-amount';amount.textContent=money.format(row.amount);
        item.append(date,invoice,name,amount);list.append(item);
      }
    } catch(e) {
      if(current!==request)return;displayMonth();
      status.textContent='Zahlungseingänge derzeit nicht verfügbar.';
    }
  }
  month.addEventListener('change',refresh);
  displayMonth();
  refresh();
  return {refresh, destroy(){request++;container.replaceChildren()}};
}
