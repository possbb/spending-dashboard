import descriptions from './merchant-descriptions.json';

const currencies={'人民币':'CNY','美元':'USD','欧元':'EUR','港币':'HKD','日元':'JPY','英镑':'GBP','澳元':'AUD','加拿大元':'CAD','新加坡元':'SGD','瑞士法郎':'CHF'};
const date='\\d{4}/\\d{2}/\\d{2}',money='-?[\\d,]+\\.\\d{2}';
const transaction=new RegExp(`^(${date})\\s+(${date})\\s+(.+?)\\s+(${money})\\s+(\\S+)\\s+(${money})\\s+(\\S+)\\s*$`);
const summary=new RegExp(`^(\\d{4})\\s+(\\S+)\\s+(${money})\\s*=\\s*(${money})\\s*-\\s*(${money})\\s*\\+\\s*(${money})\\s*-\\s*(${money})\\s*\\+\\s*(${money})\\s*\\+\\s*(${money})\\s*$`);
const cents=v=>Math.round(Number(v.replaceAll(',',''))*100);
const iso=v=>v.replaceAll('/','-');
export async function hash(value){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}
function classify(name,kind){
 if(kind==='还款')return '还款（不计消费）';if(kind==='通知')return '通知（不计消费）';
 const m=name.toUpperCase();
 if(/美团/.test(m))return '美团·用途待确认';
 if(/DIA |SORLI|AMETLLER|MERCADONA|CONDIS|SUPERMERCADOS|LEE ASIAN|ALIMENTARIA|SUPERMAKET|TOKYOYA/.test(m)||['DAY DAY GO 2021 SL','MUNTANER','WANXIN'].includes(m))return '超市与食品';
 if(/CAFE|COFFEE|XIYUE|CASA PAGES|FILETEANDO|RESTAURANT|GELATO|RODIZIO|SANA LOCURA|HMS HOST|ARBITRADE/.test(m))return '餐饮与咖啡';
 if(/IKEA|BAZAR|BASAR/.test(m))return '家居与日用品';if(/METRO BARCELONA/.test(m))return '公共交通';if(/NINTENDO/.test(m))return '游戏娱乐';return '待确认';
}
export function textLines(items){
 const lines=[];
 for(const item of items){if(!item.str?.trim())continue;const y=item.transform[5];let line=lines.find(l=>Math.abs(l.y-y)<2);if(!line){line={y,items:[]};lines.push(line);}line.items.push(item);}
 return lines.sort((a,b)=>b.y-a.y).map(l=>l.items.sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ').replace(/([\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g,'$1'));
}
export async function parseLines(pages,filename,fileHash){
 const text=pages.flat().join('\n');const period=text.match(new RegExp(`账单周期\\s*(${date})\\s*[-－—]\\s*(${date})`));
 if(!period||!['交易日期','入账日期','交易货币','入账货币'].every(s=>text.includes(s)))throw Error('暂不支持此账单版式；支持同版式广发文本PDF，扫描件需先转为文本PDF');
 const start=iso(period[1]),end=iso(period[2]);if(start>end)throw Error('账期异常');
 const rows=[],summaries=new Map();let current;
 for(let page=0;page<pages.length;page++)for(const line of pages[page]){
  const card=line.match(/卡号[：:]\s*([\d*]+)/);if(card)current=card[1].slice(-4);
  const sm=line.match(summary);if(sm){const [,tail,currency,...values]=sm;if(!currencies[currency])throw Error('未识别汇总币种');const key=tail+':'+currencies[currency];if(summaries.has(key))throw Error('重复账户汇总');summaries.set(key,values.map(cents));continue;}
  if(!new RegExp(`^${date}\\s+${date}`).test(line))continue;
  const m=line.match(transaction);if(!m)throw Error(`第${page+1}页存在未完整解析的交易行`);
  const [,day,posted,description,amount,cur,billed,bcur]=m;
  if(!current||!currencies[cur]||!currencies[bcur])throw Error('无法识别账户或币种');
  const match=description.match(/[（(](消费|退款|还款)[）)]\s*(.*)/);let kind=match?.[1]||(cents(billed)===0?'通知':null),merchant=match?.[2]||description;
  if(!kind)throw Error('无法识别交易类型');
  if(kind==='消费'&&cents(billed)<=0||['退款','还款'].includes(kind)&&cents(billed)>=0)throw Error('交易类型与金额符号不符');
  if(kind==='通知'&&description.includes('免年费'))merchant='刷卡次数免年费通知';
  if(kind==='还款')merchant=merchant.includes('购汇')?'跨行购汇还款':'跨行还款';if(merchant.includes('Nintendo'))merchant='Nintendo';
  rows.push({date:iso(day),posted:iso(posted),merchant,amount:cents(amount)/100,originalCurrency:currencies[cur],billed:cents(billed)/100,currency:currencies[bcur],kind,category:classify(merchant,kind),note:'按商户名称暂分类；具体用途可手动更正',page:page+1,sourceFile:filename,periodStart:start,periodEnd:end,'中文说明':descriptions[merchant]||`${merchant}；具体用途待确认`,_account:current+':'+currencies[bcur]});
 }
 if(!rows.length||!summaries.size)throw Error('没有识别到完整的交易及账户汇总');
 if(rows.some(r=>!summaries.has(r._account)))throw Error('交易账户缺少汇总');
 const checks=[];
 for(const [account,values] of summaries){
  const [balance,opening,paid,gross,refund,interest,cashInterest]=values;const rs=rows.filter(r=>r._account===account);const sum=kind=>rs.filter(r=>r.kind===kind).reduce((n,r)=>n+Math.round(r.billed*100),0);
  if(interest||cashInterest)throw Error('暂不支持单独列示利息的账单');
  if(sum('消费')!==gross||-sum('还款')!==paid||-sum('退款')!==refund||opening-paid+gross-refund!==balance)throw Error('交易与账户汇总不一致，整份账单未导入');
  checks.push({accountRef:(await hash(account)).slice(0,16),currency:account.split(':')[1],balance:balance/100,opening:opening/100,paid:paid/100,gross:gross/100,refund:refund/100,interest:0});
 }
 const canonical=rows.map(r=>JSON.stringify([r._account,r.date,r.posted,r.merchant,r.amount,r.originalCurrency,r.billed,r.currency,r.kind])).sort();
 const id=await hash(JSON.stringify([start,end,canonical,[...summaries].sort()]));
 const counts=new Map();for(const r of rows){const key=JSON.stringify([r._account,r.date,r.merchant,r.amount,r.originalCurrency,r.kind]);counts.set(key,(counts.get(key)||0)+1);}
 for(let i=0;i<rows.length;i++){const r=rows[i];r.accountRef=(await hash(r._account)).slice(0,16);delete r._account;r.statementId=id;r.id=id.slice(0,12)+'-T'+String(i+1).padStart(3,'0');}
 return {id,fileHash,name:filename,periodStart:start,periodEnd:end,pages:pages.length,count:rows.length,checks,duplicateRows:[...counts.values()].filter(v=>v>1).reduce((a,b)=>a+b,0),rows};
}
