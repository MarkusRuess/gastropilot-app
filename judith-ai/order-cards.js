import {archiveButton} from './order-archive.js?build=20261103-archive1';
// The existing inquiry status remains compatible with recipe and office workflows.
export const orderStages={confirmed:'🟡 Beauftragt',in_progress:'🔵 In Arbeit',ready:'🟠 Abholbereit',picked_up:'🟢 Abgeholt'};
export const orderStage=o=>o.status==='picked_up'?'picked_up':o.status==='confirmed'?(o.fulfillment_status||'confirmed'):'inquiry';
export const orderLabel=o=>orderStages[orderStage(o)]||'🟡 Anfrage';
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
export function statusControls(host,order,save){
 const row=el('div');row.className='jo-status-controls';
 const label=el('label','Auftragsstatus '),select=el('select');select.setAttribute('aria-label','Auftragsstatus');
 if(order.status==='inquiry'){const opt=el('option','Anfrage');opt.value='inquiry';select.append(opt)}
 for(const [value,text] of Object.entries(orderStages)){const opt=el('option',text);opt.value=value;select.append(opt)}
 select.value=orderStage(order);label.append(select);
 const button=el('button','Status speichern');button.type='button';
 const feedback=el('span');feedback.setAttribute('role','status');
 button.onclick=async()=>{if(select.value===orderStage(order))return;button.disabled=true;select.disabled=true;try{if(await save(order,select.value)===false){select.value=orderStage(order);return}feedback.textContent='Gespeichert'}catch(e){feedback.textContent=e.message}finally{button.disabled=false;select.disabled=false}};
 row.append(label,button,feedback);host.append(row);return row;
}
export function calendarOrderCard(order,customer,options){
 const card=el('article');card.className='jo-card';card.dataset.orderId=order.id;
 const heading=el('div');heading.className='jo-heading';heading.append(el('strong',customer.name||'Kunde unbekannt'),el('span',orderLabel(order)));
 const date=order.requested_date?.split('-').reverse().join('.')||'Termin offen';
 const info=el('p',(order.occasion||'Torte')+' · Abholung: '+date);
 const toggle=el('button','📋 Auftrag öffnen');toggle.type='button';toggle.setAttribute('aria-expanded','false');
 const body=el('div');body.className='jo-body';body.hidden=true;body.id='jo-body-'+order.id;toggle.setAttribute('aria-controls',body.id);
 let mounted=false;
 const close=()=>{body.hidden=true;toggle.textContent='📋 Auftrag öffnen';toggle.setAttribute('aria-expanded','false')};card.closeOrder=close;
 toggle.onclick=()=>{
  if(!body.hidden){close();return}
  for(const other of card.parentElement?.querySelectorAll('.jo-card')||[])if(other!==card)other.closeOrder?.();
  body.hidden=false;toggle.textContent='Auftrag schließen';toggle.setAttribute('aria-expanded','true');
  if(mounted)return;mounted=true;
  body.append(el('p',order.details||'Keine weiteren Angaben'),el('p',[customer.email,customer.phone,order.guests?'Personen: '+order.guests:''].filter(Boolean).join(' · ')));
  statusControls(body,order,options.saveStatus);archiveButton(body,order,customer,options.archiveOrder);
  const edit=el('button','✏️ Auftrag bearbeiten');edit.type='button';edit.onclick=()=>options.editOrder(body,order);body.append(edit);
  const customerEdit=el('button','✏️ Kundendaten');customerEdit.type='button';customerEdit.onclick=()=>options.editCustomer(body,customer);body.append(customerEdit);
  if(options.attachments)body.append(options.attachments(order));
  const price=el('details');price.className='jo-price';price.append(el('summary','💶 Preisberater'));const host=el('div');price.append(host);
  // Mount once, without calculate/OCR calls on opening a calendar or an order.
  price.addEventListener('toggle',()=>{if(price.open&&!host.dataset.priceMounted)options.mountPrice(host,order)});body.append(price);
 };
 card.append(heading,info,toggle,body);return card;
}
