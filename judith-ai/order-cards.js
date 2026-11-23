import {orderFacts,orderQuantityDisplay} from './order-value.mjs?build=20261123-quantities1';
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
 const heading=el('div');heading.className='jo-heading';const identity=el('div');identity.className='jo-customer-identity';identity.append(el('strong',customer.name||'Kunde unbekannt'));if(typeof customer.phone==='string'&&customer.phone.trim()){const phone=customer.phone.trim();const dial=phone.replace(/[^+\d]/g,'');if(/^\+?\d{5,16}$/.test(dial)){const link=el('a','☎ '+phone);link.className='jo-customer-phone';link.href='tel:'+dial;link.title='Kundennummer anrufen';identity.append(link)}}heading.append(identity,el('span',orderLabel(order)));
 const actions=el('div');actions.className='jo-quick-actions';
 const menu=el('button','⋯');menu.type='button';menu.className='jo-quick-menu';menu.setAttribute('aria-label','Schnellaktionen für '+(customer.name||'Auftrag'));menu.setAttribute('aria-expanded','false');
 const choices=el('div');choices.className='jo-quick-choices';choices.hidden=true;
 const hideChoices=()=>{choices.hidden=true;menu.setAttribute('aria-expanded','false')};
 menu.onclick=()=>{choices.hidden=!choices.hidden;menu.setAttribute('aria-expanded',String(!choices.hidden))};document.addEventListener('click',event=>{if(!card.isConnected)return;if(!card.contains(event.target))hideChoices()});
 const feedback=el('span');feedback.className='jo-quick-feedback';feedback.setAttribute('role','status');
 const changeStatus=async(status,button)=>{button.disabled=true;feedback.textContent='';try{const saved=await options.saveStatus(order,status);if(saved!==false){hideChoices();feedback.textContent='Gespeichert'}}catch(err){feedback.textContent=err.message||'Speichern fehlgeschlagen'}finally{button.disabled=false}};
 for(const [status,label] of [['confirmed','Bestätigt'],['in_progress','In Arbeit'],['ready','Abholbereit']]){const button=el('button',label);button.type='button';button.className='jo-menu-option';const dot=el('span','●');dot.className='jo-menu-dot jo-menu-dot-'+status;button.prepend(dot);button.onclick=()=>changeStatus(status,button);choices.append(button)}
 const alreadyPickedUp=orderStage(order)==='picked_up';const pickup=el('button',alreadyPickedUp?'↩ Rückgängig':'✓ Abgeholt');pickup.type='button';pickup.className='jo-quick-pickup';pickup.classList.toggle('jo-already-picked-up',alreadyPickedUp);pickup.dataset.pickupState=alreadyPickedUp?'picked_up':'pending';pickup.style.setProperty('background-color',alreadyPickedUp?'#e9eeec':'#16844d','important');pickup.style.setProperty('color',alreadyPickedUp?'#326251':'#ffffff','important');pickup.style.setProperty('border',alreadyPickedUp?'1px solid #b9d0c4':'1px solid #16844d','important');pickup.onclick=()=>changeStatus(alreadyPickedUp?'confirmed':'picked_up',pickup);
 actions.append(menu,pickup,feedback);
 const date=order.requested_date?.split('-').reverse().join('.')||'Termin offen';
 const {product,quantity,price}=orderFacts(order);
 const info=el('p',product);info.className='jo-cake-summary';info.title=product;
 const facts=el('div');facts.className='jo-order-facts';
 const quantityText=orderQuantityDisplay(order);if(quantityText){const qty=el('span',quantityText);qty.className='jo-quantity-summary';qty.title='Eindeutig erkannte Produktmengen aus dem gespeicherten Auftrag; keine zusätzliche KI-Auswertung';facts.append(qty)}
 if(price!==null)facts.append(el('strong','Preis brutto: '+price.toLocaleString('de-AT',{style:'currency',currency:'EUR'})));
 const pickupDate=el('p','Abholung: '+date);pickupDate.className='jo-pickup-date';
 const toggle=el('button','📋 Auftrag öffnen');toggle.type='button';toggle.setAttribute('aria-expanded','false');
 const body=el('div');body.className='jo-body';body.hidden=true;body.id='jo-body-'+order.id;toggle.setAttribute('aria-controls',body.id);
 let mounted=false;
 const close=()=>{body.hidden=true;toggle.textContent='📋 Auftrag öffnen';toggle.setAttribute('aria-expanded','false')};card.closeOrder=close;
 toggle.onclick=()=>{
  if(!body.hidden){close();return}
  for(const other of card.parentElement?.querySelectorAll('.jo-card')||[])if(other!==card)other.closeOrder?.();
  hideChoices();body.hidden=false;toggle.textContent='Auftrag schließen';toggle.setAttribute('aria-expanded','true');
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
 toggle.className='jo-menu-option jo-menu-open';choices.append(toggle);card.append(heading,info,facts,pickupDate,actions,choices,body);return card;
}
