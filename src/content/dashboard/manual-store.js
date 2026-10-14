import {readLedger,saveLedger} from './browser-store.js';
export const currencies=['EUR','USD','CNY','HKD','GBP','JPY','CHF','CAD','AUD','SGD','MOP'];
function amount(value){
 if(!/^\d+(\.\d{1,2})?$/.test(String(value)))throw Error('金额须为正数，最多两位小数');
 const cents=Math.round(Number(value)*100);
 if(!Number.isSafeInteger(cents)||cents<=0||cents>99999999999)throw Error('金额须大于0且不超过999,999,999.99');
 return cents/100;
}
export function makeManualStatement(input){
 const date=String(input.date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('请选择有效的交易日期');
 const merchant=String(input.merchant||'').trim(),note=String(input.note||'').trim();
 if(!merchant||merchant.length>100)throw Error('请填写商户名称（最多100字）');
 if(note.length>300)throw Error('说明最多300字');
 if(!currencies.includes(input.currency)||!currencies.includes(input.billedCurrency))throw Error('请选择支持的币种');
 if(!['消费','退款'].includes(input.kind))throw Error('请选择消费或退款');
 if(!input.category||!input.subcategory)throw Error('请选择分类');
 const sign=input.kind==='退款'?-1:1;
 const value=amount(input.amount)*sign;
 const billed=input.currency===input.billedCurrency?value:amount(input.billedAmount)*sign;
 const id=crypto.randomUUID(),name='手工录入 · '+date;
 const row={id:id+'-T001',statementId:id,sourceType:'manual',sourceFile:name,page:null,date,posted:date,periodStart:date,periodEnd:date,merchant,'中文说明':note||'手工录入',note:note||'用户手工录入',kind:input.kind,category:input.category,subcategory:input.subcategory,amount:value,originalCurrency:input.currency,billed,currency:input.billedCurrency,accountRef:'manual-'+input.billedCurrency};
 return {id,name,sourceType:'manual',periodStart:date,periodEnd:date,pages:0,count:1,checks:[],duplicateRows:0,rows:[row]};
}
export function saveManualEntry(input,revision){
 const current=readLedger();
 if(current.revision!==revision)throw Error('账单已在其他页面更新，请刷新后重试');
 const statement=makeManualStatement(input);
 try{saveLedger({...current,revision:crypto.randomUUID(),statements:[...current.statements,statement]});}
 catch{throw Error('保存失败，请检查浏览器存储空间；本次记录未保存');}
 return statement;
}
