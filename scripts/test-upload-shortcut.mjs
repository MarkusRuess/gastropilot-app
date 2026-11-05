import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const openArea=html.slice(html.indexOf('function openArea(name){'),html.indexOf("window.addEventListener('gp:stock-open'"));
const binding=html.match(/el\('gpUploadShortcut'\)[^\n]+/)[0];
function node(id,classes=[]){const values=new Set(classes);return {id,hidden:false,style:{setProperty(){},removeProperty(){}},classList:{contains:c=>values.has(c),remove:c=>values.delete(c),add:c=>values.add(c),toggle(c,on){const yes=on??!values.has(c);yes?values.add(c):values.delete(c);return yes;}},scrollIntoView(){this.scrolled=true;},addEventListener(type,callback){this[type]=callback;}};}
for(const business of ['Judith','Friedrich'])test('HOCHLADEN reveals startup-hidden intake for '+business,()=>{
 const intake=node('intake',['mobileHidden','gp-area-hidden']);
 const finance=node('financeSection');
 const nodes={intake,financeSection:finance,gpMockupDetailBody:{children:[intake,finance]},gpMockupDetail:node('gpMockupDetail'),gpMockupDetailTitle:node('title'),gpUploadShortcut:node('button')};
 nodes.gpMockupDetail.hidden=true;
 const body=node('body',business==='Judith'?['gp-judith-design']:[]);
 const context=vm.createContext({area:null,document:{body,querySelectorAll:()=>[]},el:id=>nodes[id],groups:{upload:['intake']},areaNames:{upload:'Unterlagen hochladen'},setDailyCalendarVisibility(){},gpRenderCharts(){}});
 vm.runInContext(openArea+'\n'+binding,context);
 nodes.gpUploadShortcut.click();
 assert.equal(intake.classList.contains('mobileHidden'),false,'Upload must escape legacy mobile filter');
 assert.equal(intake.classList.contains('gp-area-hidden'),false);
 assert.equal(finance.classList.contains('gp-area-hidden'),true);
 assert.equal(nodes.gpMockupDetail.hidden,false);
 assert.equal(nodes.gpMockupDetail.scrolled,true);
 assert.equal(body.classList.contains('gp-judith-design'),business==='Judith');
 nodes.gpMockupDetail.hidden=true;nodes.gpUploadShortcut.click();
 assert.equal(nodes.gpMockupDetail.hidden,false,'Upload reopens');
});
