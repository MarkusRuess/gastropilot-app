import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthClient } from './auth.js';

const base='https://project.supabase.co/auth/v1';
function response(data,status=200){return {ok:status>=200&&status<300,status,json:async()=>data};}

test('password login calls the existing Supabase Auth endpoint and keeps the token in memory',async()=>{
 let call;
 const client=createAuthClient('https://project.supabase.co','public-key',{fetchImpl:async(url,options)=>{call={url,options};return response({access_token:'access',refresh_token:'refresh',expires_in:3600,user:{id:'u1',email:'x@example.test'}});}});
 const {data,error}=await client.auth.signInWithPassword({email:'x@example.test',password:'secret'});
 assert.equal(error,null); assert.equal(call.url,base+'/token?grant_type=password');
 assert.equal(call.options.headers.apikey,'public-key'); assert.deepEqual(JSON.parse(call.options.body),{email:'x@example.test',password:'secret'});
 assert.equal((await client.auth.getSession()).data.session.access_token,'access');
});

test('getUser sends the access token; refresh replaces expired in-memory credentials',async()=>{
 let time=1000000, calls=[];
 const client=createAuthClient('https://project.supabase.co','key',{now:()=>time*1000,fetchImpl:async(url,options)=>{calls.push({url,options}); if(url.includes('grant_type=password'))return response({access_token:'old',refresh_token:'r1',expires_at:time+5,user:{id:'u1'}});if(url.includes('grant_type=refresh_token'))return response({access_token:'new',refresh_token:'r2',expires_in:3600,user:{id:'u1'}});return response({id:'u1',email:'x@example.test'});}});
 await client.auth.signInWithPassword({email:'x',password:'p'}); time+=10;
 const user=await client.auth.getUser();
 assert.equal(user.data.user.id,'u1'); assert.equal(calls[1].options.body,'{"refresh_token":"r1"}'); assert.equal(calls[2].options.headers.Authorization,'Bearer new');
});

test('auth errors preserve HTTP status for clear UI handling',async()=>{
 const client=createAuthClient('https://project.supabase.co','key',{fetchImpl:async()=>response({msg:'Invalid login credentials'},400)});
 const {error}=await client.auth.signInWithPassword({email:'x',password:'bad'});
 assert.equal(error.status,400); assert.equal(error.message,'Invalid login credentials');
});

test('signout clears the session and notifies listeners',async()=>{
 const events=[]; const client=createAuthClient('https://project.supabase.co','key',{fetchImpl:async(url)=>url.endsWith('/logout')?response({}):response({access_token:'a',refresh_token:'r',expires_in:3600,user:{id:'u'}})});
 client.auth.onAuthStateChange((event)=>events.push(event)); await client.auth.signInWithPassword({email:'x',password:'p'}); await client.auth.signOut();
 assert.deepEqual(events,['SIGNED_IN','SIGNED_OUT']); assert.equal((await client.auth.getSession()).data.session,null);
});
