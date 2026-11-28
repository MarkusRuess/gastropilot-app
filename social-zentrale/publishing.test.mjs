import test from 'node:test';
import assert from 'node:assert/strict';
import {preflight} from './publishing.mjs';
const base=()=>({post:{id:'p',business_id:'a',status:'approved',approved_by:'u'},channel:{id:'c',business_id:'a',status:'connected',publish_authorized:true},delivery:{business_id:'a',post_id:'p',channel_id:'c',state:'queued'},now:0});
for(const [name,change,want] of [
 ['eligible',()=>{},'eligible_for_atomic_claim'],
 ['foreign tenant',x=>x.channel.business_id='b','tenant_mismatch'],
 ['wrong post',x=>x.delivery.post_id='other','tenant_mismatch'],
 ['missing approval',x=>delete x.post.approved_by,'approval_required'],
 ['unverified media',x=>x.post.original_media_url='https://example.com/a','media_unverified'],
 ['missing permission',x=>delete x.channel.publish_authorized,'authorization_required'],
 ['uncertain delivery',x=>x.delivery.state='unknown','reconcile_or_stop'],
 ['already published',x=>x.delivery.state='published','reconcile_or_stop'],
 ['future schedule',x=>{x.post.status='scheduled';x.post.scheduled_at='2030-01-01'},'not_due']
]) test(name,()=>{const x=base();change(x);assert.equal(preflight(x),want)});
