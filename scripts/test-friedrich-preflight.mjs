import assert from 'node:assert/strict';
import {validatePreflight} from '../supabase/functions/analyze-receipt/friedrich-preflight.mjs';

const original={same_report:true,pages:[
 {image_index:1,printed_page:1,continues:true,bonit:true},
 {image_index:2,printed_page:2,continues:true,bonit:true},
 {image_index:3,printed_page:null,continues:false,bonit:true}],
 z_number:'1863',booking_from:'2026-11-12',booking_to:'2026-11-12',
 gross_total:1350.90,net_total:1159.40,cash_total:1093.30,card_total:257.60,footer_total:1350.90,
 receipt_count:101,tax_breakdown:[{rate:10,gross:444.20,net:403.82,vat:40.38},{rate:20,gross:906.70,net:755.58,vat:151.12}]};
const result=validatePreflight(original,3);
assert.equal(result.date,'2026-11-12');
assert.equal(result.gross_total,1350.90);
assert.equal(result.needs_review,true);
assert.deepEqual(result.image_indices,[1,2,3]);
for(const patch of [
 {booking_to:'2026-11-13'},
 {cash_total:1093.31},
 {footer_total:1350.80},
 {footer_total:null},
 {pages:[original.pages[0],original.pages[1],{...original.pages[2],printed_page:2}]},
 {pages:[original.pages[0],{...original.pages[1],continues:false},original.pages[2]]},
 {tax_breakdown:[{rate:10,gross:444.20,net:403.82,vat:40.38}]}
])assert.equal(validatePreflight({...original,...patch},3),null);
console.log('BONit-Originalvorprüfung: Geschäftstag und Summensperren geprüft.');
