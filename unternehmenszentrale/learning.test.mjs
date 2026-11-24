import test from 'node:test';import assert from 'node:assert/strict';import {learningEvidence} from './learning.mjs';
test('reusable function evidence is generated from actual checks',()=>{const e=learningEvidence();assert.equal(e.length,3);assert.ok(e.every(x=>x.passed&&x.live===false));});
