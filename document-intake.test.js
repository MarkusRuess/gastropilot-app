/* Run in browser after loading document-intake.js */
(function(){
 const g=globalThis.GastroPilotDocumentIntake;
 const assert=(condition,msg)=>{if(!condition)throw new Error(msg)};
 assert(g.classifyDocument("Saldenliste per 30.09.2026").type==="trial","Saldenliste");
 assert(g.classifyDocument("BONit Z-Bericht Tagesabschluss").type==="daily","BONit");
 assert(g.classifyDocument("Kontoauszug Buchungen").type==="bank","Bank");
 assert(g.classifyDocument("Lohnabrechnung September").type==="payroll","Lohn");
 assert(g.classifyLineItem("Allzweckreiniger").category==="cleaning","Reinigung");
 assert(g.classifyLineItem("Blumendekoration").category==="decoration","Deko");
 const inv={supplier:"Testlieferant",date:"2026-10-17",invoiceNumber:"A123",gross:120,items:[{name:"Allzweckreiniger",quantity:2}]};
 assert(!g.approveInvoice(inv,"",null).ok,"Keine Freigabe");
 assert(!g.approveInvoice(inv,"paid",null).ok,"Zahlungsart fehlt");
 assert(g.approveInvoice(inv,"open").record.status==="open","Offen");
 const paid=g.approveInvoice(inv,"paid","cash");
 assert(paid.ok&&paid.record.status==="paid"&&!paid.record.needsBankMatch,"Bar bezahlt");
 assert(g.approveInvoice(inv,"paid","bank").record.needsBankMatch,"Bankabgleich");
 assert(!g.approveInvoice({...inv,supplier:""},"open").ok,"Pflichtfelder");
 console.info("GastroPilot Dokumenteneingang: 11 Tests erfolgreich");
})();
