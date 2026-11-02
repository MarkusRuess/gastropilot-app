// Staff receives sanitized, persisted recommendations. No internal costs in this module.
const endpoint='https://sjnwfwcpgwsavygewwzb.supabase.co/functions/v1/judith-ai-price-advisor';
const mounted=new WeakMap();
const euro=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
async function api(payload){const headers=await window.jdHeaders?.();if(!headers)throw Error('Bitte anmelden.');const res=await fetch(endpoint,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'Preisberater nicht verfügbar.');return data;}
function el(tag,text){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;}
export function mountPriceAdvisor(host,source={},auto=false){
 if(mounted.has(host)){const controller=mounted.get(host);if(auto)void controller.refresh();return controller;}
 host.dataset.priceMounted='true';host.classList.add('price-advisor');
 if(!source.inquiry_id&&!source.message_id&&!source.draft_id)source={...source,draft_id:crypto.randomUUID()};
 host.append(el('h3','💶 Preisberater'),el('p','Interne Empfehlung · Kundenpreis bleibt unverändert · kein automatischer Versand.'));
 const fields=el('div');fields.className='price-fields';const inputs={},dirty=new Set();
 function field(key,label,type='number',value=''){const wrap=el('label',label),input=el('input');input.type=type;input.value=value;input.min=key==='customer_price'?0:1;input.step=key==='customer_price'?'0.01':'1';input.oninput=()=>{dirty.add(key);stale()};wrap.append(input);fields.append(wrap);inputs[key]=input;}
 if(!source.inquiry_id&&!source.message_id&&!source.getFields){const label=el('label','Tortenbeschreibung / Anfrage'),text=el('textarea');text.value=source.text||'';text.rows=4;text.oninput=()=>stale();label.append(text);host.append(label);inputs.text=text;}
 field('portions','Portionen gesamt','number',source.portions||'');field('cakes','Anzahl Torten','number',source.cakes||'1');field('customer_price','Kundenpreis brutto € (nur Vergleich)','number',source.customer_price||'');field('labor_minutes','Gesamte Arbeitszeit in Minuten (optional)');
 const wedding=el('label','Hochzeitstorte '),check=el('input');check.type='checkbox';check.checked=!!source.wedding;check.onchange=()=>{dirty.add('wedding');stale()};wedding.append(check);fields.append(wedding);inputs.wedding=check;
 host.append(fields);const button=el('button','Empfehlung berechnen'),status=el('p'),result=el('div'),history=el('div');button.type='button';status.setAttribute('role','status');host.append(button,status,result);
 const label=el('label','Meine Preiseinschätzung brutto €'),amount=el('input');amount.type='number';amount.min='0.01';amount.step='0.01';label.append(amount);const nlabel=el('label','Begründung'),comment=el('textarea');comment.maxLength=1000;nlabel.append(comment);const save=el('button','Eigene Einschätzung speichern');save.type='button';host.append(label,nlabel,save,history);
 let serial=0;
 function stale(){serial++;button.disabled=false;status.textContent='Angaben geändert – Empfehlung bitte neu berechnen.';result.replaceChildren();}
 function payload(){const {getFields,...base}=source;const data={...base,...(getFields?.()||{})};for(const [k,input] of Object.entries(inputs)){if(k==='wedding'){if(dirty.has(k)||check.checked)data[k]=check.checked;}else if(input.value.trim()&&(dirty.has(k)||data[k]===undefined||k==='portions'||k==='labor_minutes'||k==='text'))data[k]=input.value.trim();}return data;}
 function renderHistory(data){history.replaceChildren();for(const op of data.opinions||[])history.append(el('p','Team-Einschätzung: '+euro(op.amount_gross)+' · '+new Date(op.created_at).toLocaleDateString('de-AT')+(op.note?' · '+op.note:'')));if(data.history?.length){history.append(el('h4','Gespeicherte Empfehlungen'));for(const h of data.history)history.append(el('p',euro(h.recommended_gross)+' · '+new Date(h.created_at).toLocaleString('de-AT')+' · Schätzung'));}}
 async function run(){const runId=++serial;button.disabled=true;status.textContent='Preisempfehlung wird berechnet …';result.replaceChildren();try{
  const data=await api({action:'calculate',...payload()});if(runId!==serial)return;renderHistory(data);
  if(data.needs_input){status.textContent=data.message;for(const k of ['portions','customer_price'])if(data.fields?.[k]!=null&&!dirty.has(k))inputs[k].value=data.fields[k];if(!dirty.has('wedding'))check.checked=!!data.fields?.wedding;return;}
  const r=data.result;if(data.agreed_price_locked){inputs.customer_price.value=r.customer_price;inputs.customer_price.disabled=true;dirty.delete('customer_price');}for(const k of ['portions','customer_price'])if(r[k]!=null&&!dirty.has(k))inputs[k].value=r[k];if(!dirty.has('wedding'))check.checked=r.wedding;
  status.textContent='Vorläufige Schätzung · dauerhaft gespeichert'+(data.inquiry_id?' beim Auftrag':' beim Entwurf / der Anfrage')+' · '+new Date(r.calculated_at).toLocaleString('de-AT');
  result.append(el('strong','Empfehlung: '+euro(r.recommended_gross)),el('p','Orientierung: '+r.range_gross.map(euro).join(' – ')));
  if(r.customer_price!==null)result.append(el('p','Kundenpreis: '+euro(r.customer_price)+' · Differenz zur Empfehlung: '+euro(r.difference_gross)));
  const list=el('ul');for(const warning of r.assumptions)list.append(el('li',warning));result.append(list,el('p','Kostenbasis: '+(r.cost_basis_months.join(', ')||'vorläufige Schätzsätze')+' · aktuelle Daten bei jeder Neuberechnung.'));
  if(data.comparables?.length){result.append(el('h4','Vergleichbare frühere Aufträge (Orientierung)'));for(const c of data.comparables)result.append(el('p',[c.occasion,c.date,c.customer_price==null?'Preis nicht eindeutig erkannt':euro(c.customer_price)].filter(Boolean).join(' · ')));}
 }catch(e){if(runId===serial)status.textContent=e.message;}finally{if(runId===serial)button.disabled=false;}}
 save.onclick=async()=>{save.disabled=true;try{await api({action:'opinion',...payload(),amount:amount.value,note:comment.value});amount.value='';comment.value='';await run();}catch(e){status.textContent=e.message;}finally{save.disabled=false}};
 const controller={refresh:run,markStale:stale,draftId:source.draft_id,async attachToOrder(id){await api({action:'attach',draft_id:source.draft_id,inquiry_id:id});source={inquiry_id:id};return true;}};mounted.set(host,controller);button.onclick=run;if(auto)void run();return controller;
}
window.mountJudithPriceAdvisor=mountPriceAdvisor;
