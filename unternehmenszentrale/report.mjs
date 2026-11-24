import {readFileSync,existsSync} from 'node:fs';
export function report(projects,modules,exists=existsSync){
 return {projects:projects.map(p=>({id:p.id,name:p.name,documentation:p.source&&exists(p.source)?'available':'unconnected',live:'unverified'})),modules:modules.map(m=>({id:m.id,status:m.status})),budget:{limitEUR:15,enforcement:'unverified'},opportunities:[{module:'document-intake',product:'Document intake',validation:'required'},{module:'inventory-pricing',product:'Cost calculation',validation:'required'},{module:'mail-classification',product:'Mail assistant',validation:'required'}]};
}
if(process.argv[1]?.endsWith('/report.mjs')) console.log(JSON.stringify(report(JSON.parse(readFileSync(new URL('./projects.json',import.meta.url))),JSON.parse(readFileSync(new URL('./module-registry.json',import.meta.url))).modules),null,2));
