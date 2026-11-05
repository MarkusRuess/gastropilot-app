export const JUDITH_ID='87889eaf-f865-4e3a-8f9a-cd01db483e0e';

// A real file input receives the tap directly, including on iOS Safari.
// Restore the original nodes and attributes when leaving Judith.
const mounts=new WeakMap();
export function mountJudithPickers(doc,active){
 for(const [buttonId,inputId] of [['camera','cameraInput'],['fileButton','fileInput']]){
  const button=doc.getElementById(buttonId),input=doc.getElementById(inputId);
  if(!button||!input)continue;
  const previous=mounts.get(input);
  if(!active){
   if(previous){
    previous.parent.insertBefore(input,previous.next?.parentNode===previous.parent?previous.next:null);
    previous.wrapper.before(button);previous.wrapper.remove();
    for(const [key,value] of Object.entries(previous.attributes)){if(value===null)input.removeAttribute(key);else input.setAttribute(key,value);}
    mounts.delete(input);
   }
   continue;
  }
  if(previous)continue;
  const attributes=Object.fromEntries(['class','style','accept','aria-label'].map(key=>[key,input.getAttribute(key)]));
  const wrapper=doc.createElement('span');wrapper.style.cssText='position:relative;display:inline-grid;max-width:100%';
  mounts.set(input,{parent:input.parentNode,next:input.nextSibling,wrapper,attributes});
  button.before(wrapper);wrapper.append(button,input);
  input.classList.remove('hidden');
  input.style.cssText='display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;opacity:0!important;cursor:pointer;z-index:1;margin:0';
  input.setAttribute('aria-label',button.textContent.trim());
  input.setAttribute('accept',buttonId==='camera'?'image/*': 'image/*,application/pdf,.pdf,.xlsx,.xls');
 }
}

export async function prepareJudithFiles(files,convertImage,FileClass=File){
 const result=[];
 for(const file of files){
  if(file.size>20*1024*1024)throw Error(file.name+': über 20 MB.');
  const type=String(file.type||'').toLowerCase(),name=file.name||'Foto.jpg';
  const spreadsheet=/\.(xlsx|xls)$/i.test(name);
  if(spreadsheet||type==='application/pdf'||/\.pdf$/i.test(name)){
   result.push(!spreadsheet&&type!=='application/pdf'?new FileClass([file],name,{type:'application/pdf',lastModified:file.lastModified}):file);continue;
  }
  if(['image/jpeg','image/png','image/webp'].includes(type)){result.push(file);continue;}
  const suffix=name.match(/\.(jpe?g|png|webp)$/i)?.[1]?.toLowerCase();
  if(suffix&&(!type||type==='application/octet-stream')){
   result.push(new FileClass([file],name,{type:suffix==='jpg'||suffix==='jpeg'?'image/jpeg':'image/'+suffix,lastModified:file.lastModified}));continue;
  }
  if(type.startsWith('image/')||/\.(heic|heif)$/i.test(name)){
   try{
    const blob=await convertImage(file);
    result.push(new FileClass([blob],name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified}));
   }catch{throw Error(name+': Dieses Fotoformat lässt sich auf diesem Gerät nicht lesen. Bitte als JPG auswählen oder ein neues Kamerafoto aufnehmen.');}
   continue;
  }
  throw Error(name+': Bitte Foto, PDF oder Excel auswählen.');
 }
 return result;
}
