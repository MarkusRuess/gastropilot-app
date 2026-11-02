// Only sanitized recommendations reach this module; internal costs stay server-side.
const endpoint='https://sjnwfwcpgwsavygewwzb.supabase.co/functions/v1/judith-ai-price-advisor';
const euro=n=>new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n);
async function api(payload){const headers=await window.jdHeaders?.();if(!headers)throw Error('Bitte anmelden.');const res=await fetch(endpoint,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'Preisberater nicht verfügbar.');return data;}
function el(tag,text){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;}
export function mountPriceAdvisor(host,source={},auto=false){
 if(host.dataset.priceMounted)return;host.dataset.priceMounted='true';host.classList.add('price-advisor');
 host.append(el('h3','💶 Preisberater'));
 const note=el('p','Interne Empfehlung · Kundenpreis bleibt unverändert · kein automatischer Versand.');host.append(note);
 const fields=el('div');fields.className='price-fields';
 const inputs={};
 function field(key,label,type='number',value=''){const wrap=el('label',label),input=el('input');input.type=type;input.value=value;input.min=key==='customer_price'?0:1;input.step=key==='customer_price'?'0.01':'1';wrap.append(input);fields.append(wrap);inputs[key]=input;}
 if(!source.inquiry_id&&!source.message_id){const label=el('label','Tortenbeschreibung / Anfrage');const text=el('textarea');text.value=source.text||'';text.rows=4;label.append(text);host.append(label);inputs.text=text;}
 field('portions','Portionen gesamt');field('cakes','Anzahl Torten','number','1');field('customer_price','Kundenpreis brutto €');field('labor_minutes','Gesamte Arbeitszeit in Minuten (optional)');
 const wedding=el('label','Hochzeitstorte '),check=el('input');check.type='checkbox';wedding.append(check);fields.append(wedding);inputs.wedding=check;
 host.append(fields);const button=el('button','Empfehlung berechnen'),status=el('p'),result=el('div');button.type='button';status.setAttribute('role','status');host.append(button,status,result);
 let serial=0,weddingTouched=false;check.onchange=()=>{weddingTouched=true};
 function payload(){const data={...source};for(const [k,input] of Object.entries(inputs)){if(k==='wedding'){if(weddingTouched||check.checked)data[k]=check.checked;}else if(input.value.trim())data[k]=input.value.trim();}return data;}
 async function run(){const runId=++serial;button.disabled=true;status.textContent='Preisempfehlung wird berechnet …';result.replaceChildren();try{const data=await api({action:'calculate',...payload()});if(runId!==serial)return;if(data.needs_input){status.textContent=data.message;for(const k of ['portions','customer_price'])if(data.fields?.[k]!=null&&!inputs[k].value)inputs[k].value=data.fields[k];check.checked=!!data.fields?.wedding;return;}
  const r=data.result;if(!inputs.portions.value)inputs.portions.value=r.portions;if(!inputs.customer_price.value&&r.customer_price!=null)inputs.customer_price.value=r.customer_price;check.checked=r.wedding;
  status.textContent='Vorläufige Schätzung · '+new Date(r.calculated_at).toLocaleString('de-AT');
  result.append(el('strong','Empfehlung: '+euro(r.recommended_gross)),el('p','Orientierung: '+r.range_gross.map(euro).join(' – ')));
  if(r.customer_price!==null)result.append(el('p','Kundenpreis: '+euro(r.customer_price)+' · Differenz zur Empfehlung: '+euro(r.difference_gross)));
  const list=el('ul');for(const warning of r.assumptions)list.append(el('li',warning));result.append(list);
  result.append(el('p','Kostenbasis: '+(r.cost_basis_months.join(', ')||'vorläufige Schätzsätze')+' · aktuelle Rezepturpreise bei jedem Abruf.'));
  if(data.comparables.length){result.append(el('h4','Vergleichbare frühere Aufträge (Orientierung)'));for(const c of data.comparables)result.append(el('p',[c.occasion,c.date,c.customer_price==null?'Preis nicht eindeutig erkannt':euro(c.customer_price)].filter(Boolean).join(' · ')));}
  const label=el('label','Meine Preiseinschätzung brutto €'),amount=el('input');amount.type='number';amount.min='0.01';amount.step='0.01';label.append(amount);const nlabel=el('label','Begründung'),comment=el('textarea');comment.maxLength=1000;nlabel.append(comment);const save=el('button','Eigene Einschätzung speichern');save.type='button';save.onclick=async()=>{save.disabled=true;try{await api({action:'opinion',...payload(),amount:amount.value,note:comment.value});await run();}catch(e){status.textContent=e.message;}finally{save.disabled=false}};result.append(label,nlabel,save);
  for(const op of data.opinions)result.append(el('p','Team-Einschätzung: '+euro(op.amount_gross)+' · '+new Date(op.created_at).toLocaleDateString('de-AT')+(op.note?' · '+op.note:'')));
 }catch(e){if(runId===serial)status.textContent=e.message;}finally{if(runId===serial)button.disabled=false;}}
 button.onclick=run;if(auto)void run();return {refresh:run};
}
window.mountJudithPriceAdvisor=mountPriceAdvisor;
