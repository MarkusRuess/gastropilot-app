import {FRIEDRICH,number,orderQuantity,csv,exportRows,inventoryPdf,lastWeek,coffeeDisplay} from './friedrich-stock-engine.mjs?v=20261102';
const fmt=v=>number(v)===null?'unbekannt':new Intl.NumberFormat('de-AT',{maximumFractionDigits:3}).format(v);
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function input(form,label,type='text',value='',required=true){const l=el('label',label),i=el('input');i.type=type;i.value=value;i.required=required;if(type==='number')i.step='any';l.append(i);form.append(l);return i;}
function select(form,label,items){const l=el('label',label),s=el('select');for(const [value,name] of items){const o=el('option',name);o.value=value;s.append(o);}l.append(s);form.append(l);return s;}
const button=(host,label,fn)=>{const b=el('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){const p=host.closest('section')?.querySelector('[role=status]');if(p)p.textContent=e.message;else alert(e.message);}finally{b.disabled=false;}};host.append(b);return b;};
const check=async p=>{const r=await p;if(r.error)throw Error(r.error.message);return r.data;};
async function all(db,table,columns='*',configure=q=>q){let rows=[];for(let from=0;;from+=500){const data=await check(configure(db.from(table).select(columns).eq('business_id',FRIEDRICH)).range(from,from+499));rows.push(...data);if(data.length<500)return rows;}}
function download(blob,name){const a=el('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}
function exports(host,items,label){button(host,'CSV herunterladen',()=>download(new Blob([csv(exportRows(items))],{type:'text/csv;charset=utf-8'}),'Friedrich_Inventur_'+label+'.csv'));button(host,'PDF herunterladen',()=>download(new Blob([inventoryPdf(items,label)],{type:'application/pdf'}),'Friedrich_Inventur_'+label+'.pdf'));}
let context=null,host=null,currentTab='stock',run=0;
export async function mountStock(db,getBusiness){
 context={db,getBusiness};
 const nav=document.getElementById('gpCockpitNav');if(!nav)return;
 let tile=document.getElementById('friedrichStockTile');
 if(!tile){tile=el('button');tile.id='friedrichStockTile';tile.type='button';tile.append(el('span','📦'),el('strong','Lager & Inventur'),el('small','Bestand · Zählungen · Monatsinventur'));tile.onclick=()=>{window.dispatchEvent(new CustomEvent('gp:stock-open'));void renderStock();};nav.append(tile);}
 tile.hidden=getBusiness()!==FRIEDRICH;
 if(getBusiness()!==FRIEDRICH&&host){++run;host.replaceChildren();host.classList.add('gp-area-hidden');}
 if(!host){host=el('section',undefined,'card gp-area-hidden');host.id='friedrichStock';(document.getElementById('gpMockupDetailBody')||document.getElementById('app')).append(host);}
 if(!document.getElementById('friedrichStockStyle')){const s=el('style');s.id='friedrichStockStyle';s.textContent='#friedrichStock{grid-column:1/-1;width:100%;box-sizing:border-box}#friedrichStock .stock-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:14px 0;padding:12px;border:1px solid #dce6ed;border-radius:12px}#friedrichStock label{display:flex;flex-direction:column;gap:5px}#friedrichStock input,#friedrichStock select{max-width:100%;box-sizing:border-box;padding:10px;font:inherit}#friedrichStock td,#friedrichStock th{padding:9px;text-align:left;vertical-align:top}#friedrichStock .stock-scroll{overflow:auto}#friedrichStock .stock-warning{color:#955300}#friedrichStock button{margin:4px}body.gp-judith-design #friedrichStockTile,body.gp-judith-design #friedrichStock{display:none!important}#friedrichStockTile[hidden]{display:none!important}';document.head.append(s);}
 if(!host.dataset.routeHandled&&getBusiness()===FRIEDRICH){host.dataset.routeHandled='1';const params=new URLSearchParams(location.search);if(params.has('lager'))queueMicrotask(()=>{window.dispatchEvent(new CustomEvent('gp:stock-open'));void renderStock();});if(params.has('einkauf'))queueMicrotask(()=>document.querySelector('[data-gp-area=planning]')?.click());}
 return host;
}
function active(){return context?.getBusiness()===FRIEDRICH;}
async function state(at){return check(context.db.rpc('gp_f_stock_state',at?{p_at:at}:{}));}
async function renderStock(){
 if(!active()||!host)return;const token=++run;host.replaceChildren(el('h2','📦 Lager & Inventur · Das Friedrich'));
 const status=el('p','Lagerdaten werden geladen …');status.setAttribute('role','status');host.append(status);
 try{
 const items=await state();if(!active()||token!==run){host.replaceChildren();return;}
 status.textContent='Gemeinsamer Supabase-Bestand · Gelegentlich einzelne Artikel zählen. Keine tägliche Gesamtzählung nötig.';
 const nav=el('div',undefined,'row');host.append(nav);
 for(const [key,title] of [['stock','Lagerbestand'],['all','Alle Artikel'],['inventory','Inventur'],['review','Zuordnungen & Belege'],['recipes','Bonit & Rezepturen']]){const b=button(nav,title,()=>{currentTab=key;return renderStock();});b.disabled=currentTab===key;}
 if(currentTab==='review')return await review(host,items,status);
 if(currentTab==='recipes')return await recipes(host,items,status);
 if(currentTab==='inventory')return await inventory(host,items,status);
 host.append(el('p','Fehlende Bestände sind unbekannt. Rechnerische Mengen hängen von vollständigen Belegen und Rezepturen ab. Verluste werden separat erfasst; Reserve erhöht nur den Bestellvorschlag.','muted'));
 const form=el('form',undefined,'stock-form');
 const chosen=select(form,'Einzelnen Artikel zählen',items.map(x=>[x.item_id,x.name+' ('+x.unit+')']));
 const q=input(form,'Tatsächlich vorhandene Menge','number');q.min='0';
 const when=input(form,'Zählzeitpunkt','datetime-local');
 const dayWrap=el('label','Zählung enthält alle Verkäufe und Lieferungen dieses Tages'),complete=el('input');complete.type='checkbox';dayWrap.append(complete);form.append(dayWrap);
 const note=input(form,'Notiz','text','',false);const save=el('button','Zählung speichern');save.type='submit';form.append(save);host.append(form);
 const request=crypto.randomUUID();form.onsubmit=async e=>{e.preventDefault();if(!active())return;save.disabled=true;try{await check(context.db.from('gp_f_stock_counts').insert({business_id:FRIEDRICH,item_id:chosen.value,quantity:number(q.value),counted_at:new Date(when.value).toISOString(),day_complete:complete.checked,note:note.value,request_id:request}));await renderStock();}catch(e){status.textContent=e.message;save.disabled=false;}};
 const wrap=el('div',undefined,'stock-scroll'),table=el('table'),thead=el('thead'),tr=el('tr');for(const h of ['Artikel','Bestand','Netto-EK / Wert','Letzte Zählung','Hinweis'])tr.append(el('th',h));thead.append(tr);table.append(thead);const tbody=el('tbody');table.append(tbody);wrap.append(table);host.append(wrap);
 for(const x of items){if(currentTab==='stock'&&x.baseline===null)continue;const row=el('tr');
 row.append(el('td',x.name),el('td',fmt(x.quantity)+' '+x.unit+(x.unit==='g'?' · '+coffeeDisplay(x.quantity):'')),el('td',fmt(x.net_unit_price)+' € / '+fmt(x.value_net)+' €'),el('td',x.counted_at?new Date(x.counted_at).toLocaleString('de-AT'):'unbekannt'),el('td',(x.source_conflict?'Quellkonflikt; Bestand gesperrt. ':x.timing_warning?'Tageszeit prüfen: Tagesbonit kann Zählung am selben Tag nicht minutengenau aufteilen. ':'')+(x.quantity!==null&&x.quantity<0?'NEGATIV – Belege/Zählung fehlen. ':'')+'Basis '+fmt(x.baseline)+'; Zugang '+fmt(x.received)+'; Verkauf −'+fmt(x.consumed)+'; Verlust −'+fmt(x.loss)));tbody.append(row);}
 const gaps=[...new Set(items.flatMap(x=>x.missing_days||[]))];if(gaps.length)host.append(el('p','Fehlende Bonit-Artikeltage seit den Zählungen (regulär Do–So): '+gaps.join(', ')+'. Rechnerische Bestände sind unvollständig.','stock-warning'));
 exports(host,items,'aktuell');
 const loss=el('form',undefined,'stock-form'),li=select(loss,'Verlustartikel',items.map(x=>[x.item_id,x.name+' ('+x.unit+')'])),lq=input(loss,'Verlustmenge','number'),lt=input(loss,'Zeitpunkt','datetime-local'),ln=input(loss,'Grund');lq.min='0.001';const ls=el('button','Verlust separat speichern');loss.append(ls);const lr=crypto.randomUUID();loss.onsubmit=async e=>{e.preventDefault();if(!active())return;ls.disabled=true;try{await check(context.db.from('gp_f_stock_losses').insert({business_id:FRIEDRICH,item_id:li.value,quantity:number(lq.value),occurred_at:new Date(lt.value).toISOString(),reason:ln.value,request_id:lr}));await renderStock();}catch(e){status.textContent=e.message;ls.disabled=false;}};host.append(loss);
 if(currentTab==='all')settings(host,items,status);
 }catch(e){if(active())status.textContent='Lager konnte nicht geladen werden: '+e.message;}
}
function settings(parent,items,status){
 const details=el('details');details.append(el('summary','Gebinde / Reserve bearbeiten oder Artikel ergänzen'));parent.append(details);
 const form=el('form',undefined,'stock-form'),s=select(form,'Artikel',items.map(x=>[x.item_id,x.name])),pack=input(form,'Einkaufsgebinde in Bestandseinheiten','number','',false),label=input(form,'Gebindebezeichnung','text','',false),reserve=input(form,'Reserve in %','number','0');pack.min='0.0001';reserve.min='0';reserve.max='200';const b=el('button','Einstellungen speichern');form.append(b);details.append(form);
 const sync=()=>{const x=items.find(x=>x.item_id===s.value);pack.value=x.pack_size??'';label.value=x.pack_label??'';reserve.value=x.reserve_percent;pack.readOnly=['4c1c36d5-f7c2-4298-87ca-24ceecbe80ce','e4e19947-6ee2-4671-a8ca-b2fa52cac6d5'].includes(x.item_id);};s.onchange=sync;sync();form.onsubmit=async e=>{e.preventDefault();if(!active())return;try{await check(context.db.from('gp_f_stock_products').update({pack_size:number(pack.value),pack_label:label.value||null,reserve_percent:number(reserve.value),updated_at:new Date().toISOString()}).eq('business_id',FRIEDRICH).eq('item_id',s.value));await renderStock();}catch(e){status.textContent=e.message;}};
 const add=el('form',undefined,'stock-form'),name=input(add,'Neuer Artikel'),unit=select(add,'Lager-Einheit',[['l','Liter'],['g','Gramm'],['Stück','Stück / Flaschen']]),price=input(add,'Netto-EK je Lager-Einheit','number','',false);price.min='0';const ab=el('button','Artikel ergänzen (Bestand unbekannt)');add.append(ab);details.append(add);add.onsubmit=async e=>{e.preventDefault();if(!active())return;try{await check(context.db.rpc('gp_f_stock_add_product',{p_name:name.value,p_unit:unit.value,p_price:number(price.value)}));await renderStock();}catch(e){status.textContent=e.message;}};
}
async function inventory(parent,items,status){
 const form=el('div',undefined,'stock-form'),month=input(form,'Monat','month',new Date(new Date().getFullYear(),new Date().getMonth()-1,1).toLocaleDateString('sv-SE').slice(0,7)),reason=input(form,'Korrekturgrund (bei neuer Version)','text','',false);parent.append(form);
 parent.append(el('p','Monatsende: rechnerischer Stand einschließlich bestätigter Nullbestände. Jede Korrektur erzeugt eine neue Version; bestehende Monatsstände bleiben erhalten.','muted'));
 button(form,'Monatsendstand speichern',async()=>{if(!active())return;const r=await check(context.db.rpc('gp_f_stock_close',{p_month:month.value+'-01',p_reason:reason.value}));status.textContent='Monat '+month.value+' · Version '+r.revision+' gespeichert';await history();});
 const list=el('div');parent.append(list);
 async function history(){const rows=await all(context.db,'gp_f_stock_closings','*',q=>q.order('inventory_month',{ascending:false}).order('revision',{ascending:false}));if(!active())return;list.replaceChildren();for(const r of rows){const box=el('section');box.append(el('h3',r.inventory_month.slice(0,7)+' · Version '+r.revision),el('p',r.reason||'Erstabschluss'),el('p',new Date(r.created_at).toLocaleString('de-AT')));exports(box,r.payload.items,r.inventory_month.slice(0,7)+'_v'+r.revision);list.append(box);}const legacy=await all(context.db,'gp_inventory_snapshots');if(legacy.length){list.append(el('p',legacy.length+' frühere Monatspositionen unverändert im bisherigen Archiv erhalten.'));const groups=Map.groupBy(legacy,x=>x.inventory_month);for(const [month,rs] of groups){const box=el('section');box.append(el('h3','Bisheriger Monatsstand '+month));exports(box,rs.map(x=>({...x,name:x.article_name,value_net:x.net_unit_price===null?null:Number(x.quantity)*Number(x.net_unit_price),count_kind:'historischer Monatsstand',counted_at:x.recorded_at})),month+'_bisherig');list.append(box);}}}
 await history();
}
async function review(parent,items,status){
 const rows=await all(context.db,'gp_f_stock_lines','*',q=>q.in('state',['review','conflict']).order('created_at'));
 if(!active())return;parent.append(el('p',rows.length+' offene Positionen. Nur tatsächlich gelieferte Gesamtmenge übernehmen; Pfand und Transportgebinde ausschließen. Mit Artikelnummer gespeicherte Umrechnung gilt künftig nur für denselben Lieferanten und dieselbe Rechnungseinheit.'));
 for(const x of rows){const box=el('details');box.append(el('summary',x.name+' · '+(x.supplier||'Zählliste')+' · '+(x.delivery_date||'Datum fehlt')+' · '+x.state));
 box.append(el('p','Bisherige Originalwerte: '+JSON.stringify(x.raw_data)),el('p',x.note));if(x.candidate_data)box.append(el('p','Erneut ausgelesen: '+JSON.stringify(x.candidate_data)));const form=el('div',undefined,'stock-form'),item=select(form,'Lagerartikel',items.map(x=>[x.item_id,x.name+' ('+x.unit+')']));if(x.item_id)item.value=x.item_id;
 const qty=input(form,x.source_kind==='count'?'Gezählte Menge':'Gelieferte Gesamtmenge (Retouren negativ)','number',x.base_quantity??''),price=input(form,'Netto-EK je Lager-Einheit','number',x.base_price??'',false),date=input(form,x.source_kind==='count'?'Zählzeitpunkt':'Lieferdatum','date',x.delivery_date||''),note=input(form,'Prüfnotiz / Korrekturgrund','text','',x.state==='conflict');price.min='0';
 const countAt=x.source_kind==='count'?input(form,'Tatsächlicher Zählzeitpunkt','datetime-local'):null;
 const dayComplete=el('input');dayComplete.type='checkbox';if(countAt){const dw=el('label','Enthält alle Verkäufe und Lieferungen des Zähltages');dw.append(dayComplete);form.append(dw);}
 const remember=el('input');remember.type='checkbox';const rw=el('label','Umrechnung dieser Lieferanten-Artikelnummer für künftige Belege merken');rw.append(remember);form.append(rw);box.append(form);
 button(form,'Zuordnung bestätigen',async()=>{if(!active())return;if(!qty.value||!date.value||(countAt&&!countAt.value))throw Error('Menge, Datum und ggf. Zählzeitpunkt eintragen.');await check(context.db.rpc('gp_f_stock_confirm',{p_line:x.id,p_item:item.value,p_quantity:number(qty.value),p_price:number(price.value),p_date:date.value,p_note:note.value,p_remember:remember.checked,p_exclude:false,p_count_at:countAt?new Date(countAt.value).toISOString():null,p_day_complete:dayComplete.checked}));await renderStock();});
 button(form,'Pfand / Transport / kein Lagerartikel',async()=>{if(!active())return;await check(context.db.rpc('gp_f_stock_confirm',{p_line:x.id,p_item:item.value,p_quantity:null,p_price:null,p_date:date.value||null,p_note:note.value||'Pfand/Transportgebinde/kein Lagerartikel',p_remember:false,p_exclude:true}));await renderStock();});parent.append(box);}
 const recent=await all(context.db,'gp_f_stock_lines','*',q=>q.in('state',['confirmed','excluded']).order('created_at',{ascending:false}).limit(100));parent.append(el('h3','Letzte bestätigte / ausgeschlossene Positionen'));for(const x of recent)parent.append(el('p',x.name+' · '+x.state+' · '+fmt(x.base_quantity)+' · '+x.delivery_date+' · '+x.note));
}
async function recipes(parent,items,status){
 const rules=await all(context.db,'gp_f_stock_rules');const sales=await all(context.db,'gp_f_stock_sales','article_number,article_name');if(!active())return;
 const names=new Map(sales.map(x=>[x.article_number,x.article_name]));const mapped=new Set(rules.map(x=>x.article_number));parent.append(el('p','Eine Regel je Zutat. Mischgetränke benötigen alle Zutaten. Fehlende Zutaten/Rezepte werden nicht geschätzt. Entkoffeinierter Kaffee muss einen eigenen Lagerartikel haben.'));
 const missing=[...names].filter(([n])=>n&&!mapped.has(n));parent.append(el('p','Noch ohne Rezeptzuordnung: '+missing.map(([n,name])=>n+' '+name).join(' · '),'stock-warning'));
 const f=el('form',undefined,'stock-form'),article=select(f,'Bonit-Artikel',[...names].filter(([n])=>n).map(([n,name])=>[n,n+' · '+name])),item=select(f,'Zutat / Lagerartikel',items.map(x=>[x.item_id,x.name+' ('+x.unit+')'])),q=input(f,'Verbrauch je verkauftem Artikel','number'),note=input(f,'Belegte Rezeptgrundlage');q.min='0.000001';const b=el('button','Zutat zuordnen');f.append(b);parent.append(f);f.onsubmit=async e=>{e.preventDefault();if(!active())return;try{await check(context.db.from('gp_f_stock_rules').upsert({business_id:FRIEDRICH,article_number:article.value,item_id:item.value,per_sale:number(q.value),note:note.value},{onConflict:'article_number,item_id'}));await renderStock();}catch(e){status.textContent=e.message;}};
 for(const r of rules){const x=items.find(x=>x.item_id===r.item_id);parent.append(el('p',(names.get(r.article_number)||r.article_number)+' → '+x?.name+' · '+fmt(r.per_sale)+' '+x?.unit+' · '+r.note));}
}
export async function renderStockPlanning(db,businessId,target){
 if(businessId!==FRIEDRICH)return;const {from,until}=lastWeek();target.replaceChildren(el('p','Gemeinsamer Lagerbestand und Bonit-Verbrauch werden geladen …'));
 const [items,sales,rules,closings]=await Promise.all([check(db.rpc('gp_f_stock_state')),all(db,'gp_f_stock_sales','closing_date,article_number,quantity,gross_amount',q=>q.gte('closing_date',from).lt('closing_date',until)),all(db,'gp_f_stock_rules'),all(db,'bonit_daily_closings','closing_date,gross_amount',q=>q.gte('closing_date',from).lt('closing_date',until))]);
 if(!active())return;target.replaceChildren();
 const period=document.getElementById('purchasePeriod');const days=new Set(sales.map(x=>x.closing_date));const expected=[];for(let d=new Date(from+'T12:00Z');d.toISOString().slice(0,10)<until;d.setUTCDate(d.getUTCDate()+1)){if([0,4,5,6].includes(d.getUTCDay()))expected.push(d.toISOString().slice(0,10));}
 const missing=expected.filter(x=>!days.has(x));const mismatched=closings.filter(c=>Math.abs(sales.filter(s=>s.closing_date===c.closing_date).reduce((sum,s)=>sum+Number(s.gross_amount||0),0)-Number(c.gross_amount))>.03).map(c=>c.closing_date);
 if(period)period.textContent='Vergleichswoche '+from+' bis '+until+' (exklusiv) · '+days.size+' Bonit-Artikeltage · fehlende reguläre Öffnungstage (Do–So): '+(missing.join(', ')||'keine')+' · Umsatzabgleich offen: '+([...new Set(mismatched)].join(', ')||'keiner');
 target.append(el('p','Wochenbedarf = zugeordneter Verbrauch der letzten vollständigen Kalenderwoche. Bestellmenge = auf Einkaufsgebinde aufgerundet: (Wochenbedarf + Reserve − verfügbarer Bestand). Fehlende Tage werden nicht geschätzt.','muted'));
 const lines=[];
 for(const x of items){const relevant=rules.filter(r=>r.item_id===x.item_id);if(!relevant.length)continue;const demand=sales.reduce((sum,s)=>sum+relevant.filter(r=>r.article_number===s.article_number).reduce((v,r)=>v+Number(s.quantity)*Number(r.per_sale),0),0);const qty=orderQuantity(demand,x.reserve_percent,x.quantity,x.pack_size);const card=el('div',undefined,'top-article');card.append(el('strong',x.name),el('div',fmt(demand)+' '+x.unit+' Wochenbedarf + '+fmt(x.reserve_percent)+' % Reserve − '+fmt(x.quantity)+' '+x.unit+' Lager', 'metrics'),el('b',qty===null?'Bestellmenge offen: Bestand oder Einkaufsgebinde unbekannt':qty+' × '+(x.pack_label||fmt(x.pack_size)+' '+x.unit)));target.append(card);lines.push(x.name+': '+(qty===null?'offen':qty+' × '+x.pack_label));}
 const mapped=new Set(rules.map(r=>r.article_number)),unknown=[...new Set(sales.filter(s=>!mapped.has(s.article_number)).map(s=>s.article_number||'ohne Artikelnummer'))];target.append(el('p','Ohne Verbrauchszuordnung: '+(unknown.join(', ')||'keine')+'. Milch, Soda und weitere fehlende Rezeptkomponenten bleiben offen.','stock-warning'));
 button(target,'Bestellliste kopieren',()=>navigator.clipboard.writeText('Das Friedrich · Einkauf\n'+period?.textContent+'\n'+lines.join('\n')));
 button(target,'📦 Lager & Inventur öffnen',()=>{window.dispatchEvent(new CustomEvent('gp:stock-open'));return renderStock();});
 const settings=document.getElementById('purchaseKeg')?.closest('.row');if(settings)settings.hidden=true;
}
// Used only by the existing central upload, never stores images.
export async function stageInventoryRecognition(db,businessId,userId,documents){
 if(businessId!==FRIEDRICH)throw Error('Zähllisten nur für Friedrich.');
 for(const d of documents){await check(db.from('documents').insert({business_id:FRIEDRICH,uploaded_by:userId,document_type:'other',document_date:d.date||null,status:'reviewed',extracted_data:{...d,inventory_counts:d.inventory_counts}}));}
}
