import {number,unitPrice,currentMail} from '../supabase/functions/judith-ai-price-advisor/engine.mjs';
export function learningEvidence(){
 const checks=[
 {module:'inventory-pricing',rule:'Currency parsing preserves decimal precision',passed:number('1.250,50 €')===1250.5},
 {module:'inventory-pricing',rule:'Unit conversion rejects incompatible dimensions',passed:unitPrice(10,'kg','g')===0.01&&unitPrice(10,'kg','l')===null},
 {module:'mail-classification',rule:'Quoted mail is separated from current message',passed:currentMail('Neue Anfrage\nVon: Alt')==='Neue Anfrage'}
 ];
 return checks.map(c=>({...c,scope:'synthetic function check',live:false}));
}
if(process.argv[1]?.endsWith('/learning.mjs')){const evidence=learningEvidence();console.log(JSON.stringify(evidence,null,2));if(evidence.some(c=>!c.passed))process.exitCode=1;}
