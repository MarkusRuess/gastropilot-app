import test from 'node:test';
import assert from 'node:assert/strict';
import {number,unitPrice,currentMail} from '../supabase/functions/judith-ai-price-advisor/engine.mjs';
test('reuse existing currency parser',()=>{assert.equal(number('1.250,50 €'),1250.5);assert.equal(number(-1),null);});
test('reuse existing unit conversion without mixing dimensions',()=>{assert.equal(unitPrice(10,'kg','g'),0.01);assert.equal(unitPrice(2,'l','ml'),0.002);assert.equal(unitPrice(10,'kg','l'),null);});
test('reuse mail quote removal',()=>{assert.equal(currentMail('Neue Anfrage\nVon: Alt'),'Neue Anfrage');});
