import {listBusinesses} from './business-switch.mjs';
import {loadDashboard} from './load-dashboard.mjs';
// Host must supply its existing user-scoped client. No credentials in this module.
export async function mountSocial({client,select,month,render,clear,showError}){
 let generation=0,disposed=false;
 const refresh=async()=>{
  const token=++generation;clear();
  try{
   if(!select.value||!month.value)return;
   const data=await loadDashboard(client,select.value,month.value);
   if(!disposed&&token===generation)render(data);
  }catch{if(!disposed&&token===generation)showError('Dashboard nicht verfügbar');}
 };
 const dispose=()=>{disposed=true;generation++;clear();select.replaceChildren();select.removeEventListener('change',refresh);month.removeEventListener('change',refresh);};
 clear();select.replaceChildren();
 try{
  const businesses=await listBusinesses(client);
  for(const business of businesses){const option=document.createElement('option');option.value=business.id;option.textContent=business.name;select.append(option);}
  select.addEventListener('change',refresh);month.addEventListener('change',refresh);
  await refresh();
 }catch{dispose();showError('Anmeldung oder Betriebszugriff nicht verfügbar');}
 return dispose;
}
