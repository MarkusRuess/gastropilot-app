// Read-only dashboard model. Input must already be authorized server-side.
export function dashboard({businessId,posts=[],channels=[],deliveries=[],month}) {
 if(typeof businessId!=='string'||!businessId||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('invalid_scope');
 const own=rows=>rows.filter(r=>r.business_id===businessId);
 const p=own(posts), c=own(channels), d=own(deliveries);
 const calendar=p.filter(r=>typeof r.scheduled_at==='string'&&r.scheduled_at.slice(0,7)===month).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)).map(({id,body,status,scheduled_at})=>({id,body,status,scheduled_at}));
 return {calendar,channels:c.map(({id,platform,display_name,status})=>({id,platform,display_name,status})),counts:{drafts:p.filter(r=>r.status==='draft').length,pending:p.filter(r=>r.status==='pending_approval').length,scheduled:p.filter(r=>r.status==='scheduled').length,published:d.filter(r=>r.state==='published').length,errors:d.filter(r=>['failed','unknown'].includes(r.state)).length}};
}
