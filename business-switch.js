/* GastroPilot: direkte Betriebswahl nur für autorisierte Mitgliedschaften. */
window.GastroPilotBusiness={
 key:'gastropilot-selected-business',
 choose(members){
  const allowed=(members||[]).filter(x=>x.business_id&&x.businesses?.name);
  const saved=localStorage.getItem(this.key);
  return allowed.find(x=>x.business_id===saved)||
    allowed.find(x=>x.businesses.name.includes('Friedrich'))||
    allowed[0]||null;
 },
 render(members,currentId){
  const host=document.getElementById('gp-business-switch');
  if(!host)return;
  host.replaceChildren();
  const allowed=(members||[]).filter(x=>x.business_id&&x.businesses?.name);
  if(!allowed.length)return;
  const title=document.createElement('div');
  title.textContent='Betrieb wechseln';
  title.style.cssText='font-size:13px;font-weight:700;margin:0 0 9px;color:#111';
  const group=document.createElement('div');
  group.setAttribute('role','group');
  group.setAttribute('aria-label','Betrieb wechseln');
  group.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px';
  for(const member of allowed){
   const active=member.business_id===currentId;
   const btn=document.createElement('button');
   btn.type='button';
   btn.setAttribute('aria-pressed',String(active));
   btn.style.cssText='display:flex;align-items:center;gap:9px;min-height:65px;text-align:left;padding:12px;border:1px solid '+(active?'#111':'#d5d5d5')+';border-radius:12px;background:#fff;color:#111;font-weight:700;cursor:pointer';
   const circle=document.createElement('span');
   circle.setAttribute('aria-hidden','true');
   circle.textContent=active?'◉':'○';
   circle.style.cssText='font-size:23px;line-height:1;color:#111;flex-shrink:0';
   const name=document.createElement('span');
   name.textContent=member.businesses.name.includes('Friedrich')?'Das Friedrich':member.businesses.name.includes('Judith')?'Judith und die Torten':member.businesses.name;
   name.style.cssText='font-size:14px;line-height:1.3;color:#111';
   btn.append(circle,name);
   btn.addEventListener('click',()=>{
    if(member.business_id===currentId)return;
    localStorage.setItem(this.key,member.business_id);
    window.location.reload();
   });
   group.append(btn);
  }
  host.append(title,group);
  const subtitle=document.querySelector('header small');
  if(subtitle)subtitle.textContent=(allowed.find(m=>m.business_id===currentId)?.businesses?.name||'GastroPilot')+(location.pathname.includes('management')?' · Verwaltung':'');
 }
};