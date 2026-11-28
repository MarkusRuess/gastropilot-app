// Server-side only. The client must be a user-scoped Supabase client, never service_role.
import {dashboard} from './dashboard.mjs';
export async function loadDashboard(client,businessId,month){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('invalid_scope');
 const {data:auth,error:authError}=await client.auth.getUser();
 if(authError||!auth?.user?.id) throw new Error('unauthorized');
 const membership=await client.from('business_members').select('business_id').eq('business_id',businessId).eq('user_id',auth.user.id).maybeSingle();
 if(membership.error||!membership.data) throw new Error('forbidden');
 const specs=[['social_posts','id,business_id,body,status,scheduled_at'],['social_channels','id,business_id,platform,display_name,status'],['social_deliveries','business_id,state']];
 const rows=await Promise.all(specs.map(([table,fields])=>client.from(table).select(fields).eq('business_id',businessId).limit(1001)));
 if(rows.some(r=>r.error||!Array.isArray(r.data)||r.data.length>=1000)) throw new Error('dashboard_unavailable');
 return dashboard({businessId,month,posts:rows[0].data,channels:rows[1].data,deliveries:rows[2].data});
}
