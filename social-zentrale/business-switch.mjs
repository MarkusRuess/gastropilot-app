// Reuse existing authenticated client; never accept service credentials.
export async function listBusinesses(client) {
 const {data,error}=await client.auth.getUser();
 if(error||!data?.user?.id) throw new Error('unauthorized');
 const result=await client.from('business_members').select('business_id').eq('user_id',data.user.id);
 if(result.error||!Array.isArray(result.data)) throw new Error('membership_unavailable');
 const ids=[...new Set(result.data.map(x=>x.business_id))];
 if(!ids.length) return [];
 const businesses=await client.from('businesses').select('id,name').in('id',ids);
 if(businesses.error||!Array.isArray(businesses.data)) throw new Error('businesses_unavailable');
 return businesses.data.filter(x=>ids.includes(x.id)).map(({id,name})=>({id,name}));
}
