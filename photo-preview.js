/* Shared client-side OCR for photo/PDF review. No automatic posting. */
(function(){
 const config={
 fsPdf:{preview:'fsPreview',status:'fsStatus',trigger:'fsRead'},
 ctlPdf:{preview:'ctlText',status:'ctlStatus',trigger:'ctlRead'},
 bankPdf:{preview:'bankPreview',status:'bankImportStatus',trigger:'bankRead'},
 payrollPdf:{preview:'payrollPreview',status:'payrollStatus',trigger:'payrollRead'}
 };
 let ocrLibrary=null;
 async function recognize(file){
  if(file.size>15*1024*1024)throw Error('Maximal 15 MB pro Bild.');
  if(!/image\/(jpeg|png|webp)/i.test(file.type)&&!/\.(jpe?g|png|webp)$/i.test(file.name))throw Error('Für OCR bitte JPG, PNG oder WebP verwenden.');
  if(!ocrLibrary){
   await new Promise((resolve,reject)=>{
    if(window.Tesseract)return resolve();
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    script.onload=resolve;script.onerror=()=>reject(Error('Texterkennung konnte nicht geladen werden.'));
    document.head.append(script);
   });
   ocrLibrary=window.Tesseract;
  }
  const worker=await ocrLibrary.createWorker('deu+eng');
  try{const result=await worker.recognize(file);return result.data.text||''}
  finally{await worker.terminate()}
 }
 for(const [id,c] of Object.entries(config)){
  const input=document.getElementById(id);
  if(!input)continue;
  const trigger=document.getElementById(c.trigger);
  const preview=document.getElementById(c.preview);
  const status=document.getElementById(c.status);
  const photo=document.querySelector('[data-photo-for="'+id+'"]');
  const wrapper=photo?.closest('.gp-photo-alternative');
  if(wrapper)wrapper.querySelector('small').textContent='Foto wird lokal per Texterkennung vorbereitet. Alle Werte vor dem Speichern am Original kontrollieren.';
  if(photo)photo.addEventListener('change',()=>{if(photo.files?.length){try{input.files=photo.files}catch(e){} }});
  async function handle(file){
   if(!file)return;
   if(!/image\//i.test(file.type)&&!/\.(jpe?g|png|webp)$/i.test(file.name))return;
   status.textContent='Foto wird lokal erkannt. Bitte warten …';
   try{
    const text=(await recognize(file)).trim();
    if(!text)throw Error('Kein lesbarer Text erkannt. Bitte besser beleuchtet fotografieren.');
    preview.value=text.slice(0,60000);
    preview.dispatchEvent(new Event('input',{bubbles:true}));
    status.textContent='Fototext erkannt. Bitte Werte sorgfältig mit dem Original vergleichen. Automatische Buchung erfolgt nicht.';
    if(id==='payrollPdf'){document.getElementById('payrollReview')?.classList.remove('hidden');}
    if(id==='bankPdf'){document.getElementById('bankReview')?.classList.remove('hidden');}
   }catch(e){status.textContent='Foto konnte nicht erkannt werden: '+e.message}
  }
  input.addEventListener('change',()=>handle(input.files?.[0]));
  if(photo)photo.addEventListener('change',()=>handle(photo.files?.[0]));
  if(trigger)trigger.addEventListener('click',e=>{
   const file=input.files?.[0]||photo?.files?.[0];
   if(file&&(/image\//i.test(file.type)||/\.(jpe?g|png|webp)$/i.test(file.name))){
    e.stopImmediatePropagation();e.preventDefault();handle(file);
   }
  },true);
 }
 document.querySelectorAll('input[data-photo-for]').forEach(input=>{
  const target=document.querySelector('[data-preview-for="'+input.dataset.photoFor+'"]');
  let url=null;
  input.addEventListener('change',()=>{
   if(url)URL.revokeObjectURL(url);target.replaceChildren();
   const file=input.files?.[0];if(!file)return;
   const p=document.createElement('p');p.textContent='Foto: '+file.name;target.append(p);
   if(file.type.startsWith('image/')){
    url=URL.createObjectURL(file);const img=document.createElement('img');img.src=url;img.alt='Belegvorschau';
    img.style.cssText='max-width:100%;max-height:420px;object-fit:contain;border:1px solid #ddd';target.append(img);
   }
  });
 });
})();
