/* Fotoalternative: lokale Sichtprüfung, keine OCR und kein automatischer Upload. */
document.querySelectorAll('input[data-photo-for]').forEach(input=>{
 const target=document.querySelector('[data-preview-for="'+input.dataset.photoFor+'"]');
 let currentUrl=null;
 input.addEventListener('change',()=>{
   if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=null;}
   target.replaceChildren();
   const file=input.files&&input.files[0];
   if(!file)return;
   if(file.size>15*1024*1024){target.textContent='Bild zu groß (maximal 15 MB).';return;}
   const note=document.createElement('p');
   note.textContent='Foto ausgewählt: '+file.name+' — bitte Werte im Original prüfen und manuell in die Felder übernehmen.';
   target.append(note);
   if(file.type.startsWith('image/')){
     currentUrl=URL.createObjectURL(file);
     const img=document.createElement('img');
     img.src=currentUrl;img.alt='Vorschau des ausgewählten Belegfotos';
     img.style.cssText='max-width:100%;max-height:420px;object-fit:contain;border:1px solid #ddd;border-radius:8px';
     target.append(img);
   }else{
     const warning=document.createElement('p');warning.textContent='Für dieses Bildformat ist möglicherweise keine Browser-Vorschau möglich.';target.append(warning);
   }
 });
});
