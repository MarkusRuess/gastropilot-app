import test from 'node:test';
import assert from 'node:assert/strict';
import {listBusinesses} from './business-switch.mjs';
function client({user='u',members=[{business_id:'a'}],businesses=[{id:'a',name:'A'},{id:'b',name:'B'}],error=null}={}){
 return {auth:{getUser:async()=>({data:{user:user?{id:user}:null}})},from(table){return {select(){return {eq:async()=>({data:members,error}),in:async()=>({data:businesses,error})}}}}};
}
test('only assigned businesses',async()=>assert.deepEqual(await listBusinesses(client()),[{id:'a',name:'A'}]));
test('no session',async()=>assert.rejects(listBusinesses(client({user:null})),/unauthorized/));
test('no memberships',async()=>assert.deepEqual(await listBusinesses(client({members:[]})),[]));
test('membership error fails closed',async()=>assert.rejects(listBusinesses(client({error:'failed'})),/membership_unavailable/));
