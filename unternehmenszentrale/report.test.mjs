import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {report} from './report.mjs';
const projects=JSON.parse(readFileSync(new URL('./projects.json',import.meta.url)));
test('project inventory is unique and does not invent connections',()=>{assert.equal(new Set(projects.map(p=>p.id)).size,projects.length);const r=report(projects,[],()=>true);assert.equal(r.projects.filter(p=>p.documentation==='unconnected').length,2);assert.ok(r.projects.every(p=>p.live==='unverified'));assert.equal(r.budget.enforcement,'unverified');});
test('missing documentation stays unconnected',()=>{assert.ok(report(projects,[],()=>false).projects.every(p=>p.documentation==='unconnected'));});
