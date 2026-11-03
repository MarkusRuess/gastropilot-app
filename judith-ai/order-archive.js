const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e};
export function archiveButton(host,order,customer,run,restore=false){
 if(!run)return;
 const button=node('button',restore?'↩️ Auftrag wiederherstellen':'🗑️ Auftrag entfernen');button.type='button';button.className='jo-archive-button';
 const feedback=node('span');feedback.setAttribute('role','status');
 button.onclick=async()=>{const date=order.requested_date?.split('-').reverse().join('.')||'Datum offen',name=customer.name||'Kunde unbekannt';
  if(!confirm((restore?'Auftrag wiederherstellen?':'Auftrag sicher archivieren?')+'\n'+name+' · '+date+(restore?'':'\nKunden- und Zahlungsdaten bleiben erhalten.')))return;
  button.disabled=true;try{await run(order,restore);feedback.textContent=restore?'Wiederhergestellt':'Archiviert'}catch(e){feedback.textContent=e.message}finally{button.disabled=false}
 };host.append(button,feedback);return button;
}
