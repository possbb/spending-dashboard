import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyData,categoryColor} from '../src/content/dashboard/monthly-data.js';
test('monthly net amounts retain cents, skip repayments and leave missing months null',()=>{
 const rows=[{date:'2026-01-03',kind:'消费',category:'超市与食品',amount:10.1,billed:12},{date:'2026-01-04',kind:'退款',category:'超市与食品',amount:-.2,billed:-.3},{date:'2026-03-01',kind:'退款',category:'餐饮与咖啡',amount:-5,billed:-6},{date:'2026-02-03',kind:'还款',category:'还款',amount:100,billed:100}];
 const result=monthlyData(rows,'amount');
 assert.deepEqual(result.months.map(m=>m.month),['2026-01','2026-02','2026-03']);
 assert.deepEqual(result.months.map(m=>m.total),[9.9,null,-5]);
 assert.equal(result.months[1].values['超市与食品'],null);
 assert.equal(result.months[0].values['餐饮与咖啡'],0);
 assert.equal(monthlyData(rows,'billed').months[0].total,11.7);
});
test('single-month data and year boundaries remain explicit',()=>{
 assert.deepEqual(monthlyData([],'amount').months,[]);
 const row={date:'2025-12-01',kind:'消费',category:'其他消费',amount:1};
 assert.equal(monthlyData([row],'amount').months.length,1);
 assert.deepEqual(monthlyData([row,{...row,date:'2026-02-01'}],'amount').months.map(m=>m.month),['2025-12','2026-01','2026-02']);
 assert.notEqual(categoryColor('超市与食品'),categoryColor('餐饮与咖啡'));
});
