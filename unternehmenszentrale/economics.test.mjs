import test from 'node:test';import assert from 'node:assert/strict';import {economics} from './economics.mjs';
test('missing costs never become zero',()=>assert.equal(economics({revenueCents:100}).status,'incomplete'));
test('profit and loss',()=>{assert.equal(economics({revenueCents:10000,costCents:8000}).profitCents,2000);assert.equal(economics({revenueCents:10000,costCents:12000}).margin,-0.2);});
test('zero revenue and invalid inputs',()=>{assert.equal(economics({revenueCents:0,costCents:100}).margin,null);assert.equal(economics({revenueCents:100,costCents:-1}).status,'incomplete');});
