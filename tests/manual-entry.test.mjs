import test from 'node:test';
import assert from 'node:assert/strict';
import {makeManualStatement,saveManualEntry} from '../src/content/dashboard/manual-store.js';
import {readLedger} from '../src/content/dashboard/browser-store.js';
const input={date:'2026-10-14',merchant:'测试商户',amount:'12.35',currency:'EUR',billedCurrency:'EUR',kind:'消费',category:'餐饮与咖啡',subcategory:'咖啡与甜品',note:'测试说明'};
test('manual expenses retain exact amounts, classification and honest provenance',()=>{
 const s=makeManualStatement(input),r=s.rows[0];
 assert.equal(r.amount,12.35);assert.equal(r.billed,12.35);assert.equal(r.subcategory,'咖啡与甜品');
 assert.equal(r.sourceType,'manual');assert.equal(r.statementId,s.id);assert.deepEqual(s.checks,[]);
});
test('refunds subtract both currencies without estimated conversion',()=>{
 const r=makeManualStatement({...input,kind:'退款',billedCurrency:'USD',billedAmount:'14.20'}).rows[0];
 assert.equal(r.amount,-12.35);assert.equal(r.billed,-14.2);
 assert.throws(()=>makeManualStatement({...input,billedCurrency:'USD',billedAmount:''}));
});
test('rejects invalid dates, blank merchants and invalid amounts',()=>{
 for(const amount of ['0','-1','1.234','Infinity','1e3','1000000000'])assert.throws(()=>makeManualStatement({...input,amount}));
 for(const date of ['2026-02-30','','invalid'])assert.throws(()=>makeManualStatement({...input,date}));
 assert.throws(()=>makeManualStatement({...input,merchant:'  '}));
});
test('saving preserves existing data and rejects stale revision and storage failure',()=>{
 const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const first=saveManualEntry(input,'empty'),state=readLedger();
 saveManualEntry({...input,kind:'退款'},state.revision);
 assert.equal(readLedger().statements.length,2);assert.deepEqual(readLedger().statements[0],first);
 assert.throws(()=>saveManualEntry(input,state.revision),/其他页面/);
 const before=readLedger();globalThis.localStorage.setItem=()=>{throw Error('quota');};
 assert.throws(()=>saveManualEntry(input,before.revision),/保存失败/);
 assert.deepEqual(readLedger(),before);delete globalThis.localStorage;
});
