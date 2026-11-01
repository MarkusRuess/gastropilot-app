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
  const month=document.createElement('input');month.type='month';
  month.value=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Vienna'}).slice(0,7);
  month.setAttribute('aria-label','Monat auswählen');
  const status=document.createElement('p');status.setAttribute('role','status');
  const list=document.createElement('div');
  container.append(title,month,status,list);
  const money=new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'});
  let request=0;
  async function refresh(){
    const current=++request;list.replaceChildren();status.textContent='Lade Zahlungseingänge …';
    try {
      const rows=await loadPayments({month:month.value});
      if(current!==request)return;
      if(!Array.isArray(rows))throw Error('Ungültige Antwort');
      const safe=rows.filter(r=>r && /^\\d{4}-\\d{2}-\\d{2}$/.test(r.date) &&
        r.date.startsWith(month.value) && Number.isFinite(r.amount) && r.amount>0);
      status.textContent=safe.length+' Zahlungseingänge';
      for(const row of safe){
        const item=document.createElement('div');item.className='judith-payment-row';
        const date=document.createElement('span');
        date.textContent=row.date.slice(8,10)+'.'+row.date.slice(5,7)+'.'+row.date.slice(0,4)+' ';
        const invoice=document.createElement('strong');
        invoice.textContent=row.invoiceNumber||'Keine Rechnungsnummer';
        const name=document.createElement('span');name.textContent=' · '+(row.name||'Unbekannt');
        const amount=document.createElement('span');amount.textContent=' · '+money.format(row.amount);
        item.append(date,invoice,name,amount);list.append(item);
      }
    } catch(e) {
      if(current!==request)return;
      status.textContent='Zahlungseingänge derzeit nicht verfügbar.';
    }
  }
  month.addEventListener('change',refresh);
  refresh();
  return {refresh, destroy(){request++;container.replaceChildren()}};
}
