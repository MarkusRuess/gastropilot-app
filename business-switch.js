/* GastroPilot: Auswahl ausschließlich unter autorisierten Betriebsmitgliedschaften. */
window.GastroPilotBusiness={
 key:'gastropilot-selected-business',
 choose(members){
  const allowed=(members||[]).filter(x=>x.business_id&&x.businesses?.name);
  const saved=localStorage.getItem(this.key);
  return allowed.find(x=>x.business_id===saved)||allowed.find(x=>x.businesses.name.includes('Friedrich'))||allowed[0]||null;
 },
 render(members,currentId){
  const host=document.getElementById('gp-business-switch');
  if(!host)return;
  host.replaceChildren();
  const allowed=(members||[]).filter(x=>x.business_id&&x.businesses?.name);
  if(!allowed.length)return;
  const label=document.createElement('label');
  label.textContent='Betrieb auswählen';
  label.htmlFor='gp-business-select';
  label.style.cssText='display:block;font-weight:700;margin:0 0 6px;color:#111';
  const select=document.createElement('select');
  select.id='gp-business-select';
  select.style.cssText='display:block;width:100%;background:#fff;color:#111;border:1px solid #ccc;padding:11px;border-radius:9px';
  for(const m of allowed){const option=document.createElement('option');option.value=m.business_id;option.textContent=m.businesses.name;select.append(option)}
  select.value=currentId;
  select.addEventListener('change',()=>{
   if(!allowed.some(m=>m.business_id===select.value))return;
   localStorage.setItem(this.key,select.value);
   window.location.reload();
  });
  host.append(label,select);
 }
};