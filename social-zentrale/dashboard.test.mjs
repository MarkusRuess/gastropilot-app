import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboard} from './dashboard.mjs';
const input={businessId:'a',month:'2026-11',posts:[{id:'1',business_id:'a',body:'own',status:'scheduled',scheduled_at:'2026-11-20T10:00:00Z'},{id:'2',business_id:'b',body:'foreign',status:'draft',scheduled_at:'2026-11-01T10:00:00Z'},{id:'3',business_id:'a',status:'draft'},{id:'4',business_id:'a',status:'scheduled',scheduled_at:'2026-12-01T10:00:00Z'}],channels:[{id:'c',business_id:'a',platform:'instagram',secret:'hidden'},{id:'d',business_id:'b'}],deliveries:[{business_id:'a',state:'published'},{business_id:'a',state:'unknown'},{business_id:'b',state:'failed'}]};
test('calendar excludes foreign and other months',()=>assert.deepEqual(dashboard(input).calendar.map(x=>x.id),['1']));
test('channels exclude foreign and secret fields',()=>{const x=dashboard(input).channels;assert.equal(x.length,1);assert.equal(x[0].secret,undefined)});
test('counts isolated',()=>assert.deepEqual(dashboard(input).counts,{drafts:1,pending:0,scheduled:2,published:1,errors:1}));
test('invalid scope rejected',()=>assert.throws(()=>dashboard({...input,businessId:''})));
test('invalid month rejected',()=>assert.throws(()=>dashboard({...input,month:'2026-13'})));
