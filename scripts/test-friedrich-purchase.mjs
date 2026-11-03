import {test} from 'node:test';import assert from 'node:assert/strict';import {purchaseCost,actualCost} from '../friedrich-stock-costs.mjs';
test('net purchases exclude operating supplies and preserve returns',()=>{assert.equal(purchaseCost([{state:'confirmed',raw_data:{category:'food',line_net:20}},{state:'excluded',raw_data:{category:'cleaning',line_net:10}},{state:'confirmed',raw_data:{category:'food',line_net:-2}}]).net,18);});
test('unreviewed and conflict positions cannot silently become actual costs',()=>{assert.equal(purchaseCost([{state:'conflict',name:'X',raw_data:{line_net:20}}]).warnings.length,1);});
const full={opening:[{physical:true,value:100}],closing:[{physical:true,value:40}],purchases:{net:200,warnings:[]},revenue:1000,complete:true,ended:true};
test('actual cost uses inventories once; ratio uses net revenue',()=>{assert.deepEqual(actualCost(full),{cost:260,ratio:26,deviation:0,warnings:[]});});
for(const [name,patch] of [['missing stock',{opening:[{physical:false,value:100}]}],['unconfirmed receipts',{complete:false}],['current month',{ended:false}],['missing valuation',{closing:[{physical:true,value:null}]}],['open position',{purchases:{net:200,warnings:['offen']}}]])test(name,()=>assert.equal(actualCost({...full,...patch}).cost,null));
test('no net revenue never produces a percentage',()=>assert.equal(actualCost({...full,revenue:null}).ratio,null));
test('negative consumption is held for review',()=>assert.equal(actualCost({...full,closing:[{physical:true,value:400}]}).cost,null));
