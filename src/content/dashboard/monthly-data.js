const categories=['超市与食品','餐饮与咖啡','家居与日用品','公共交通','游戏娱乐','服饰鞋包','医疗健康','教育学习','旅游住宿','通讯与订阅','美团·用途待确认','待确认','其他消费'];
const colors=['#6868ff','#00a3bd','#00a77a','#d34880','#bd8900','#8c62c9','#d57839','#488abe','#967151','#b44ba0','#637b3b','#687888','#a45959'];
export const categoryColor=category=>colors[Math.max(0,categories.indexOf(category))%colors.length];
export function monthlyData(rows,field){
 const spend=rows.filter(r=>['消费','退款'].includes(r.kind));
 const months=[...new Set(spend.map(r=>r.date.slice(0,7)))].sort();
 const names=[...new Set(spend.map(r=>r.category))].sort((a,b)=>categories.indexOf(a)-categories.indexOf(b));
 if(!months.length)return {categories:names,months:[]};
 const sums=new Map();
 for(const r of spend){const m=r.date.slice(0,7);if(!sums.has(m))sums.set(m,{});const entry=sums.get(m);entry[r.category]=(entry[r.category]||0)+Math.round(r[field]*100);}
 const ordinal=m=>Number(m.slice(0,4))*12+Number(m.slice(5))-1;
 const result=[];
 for(let i=ordinal(months[0]);i<=ordinal(months.at(-1));i++){
  const month=`${Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`,s=sums.get(month);
  const values=Object.fromEntries(names.map(c=>[c,s?(s[c]||0)/100:null]));
  result.push({month,available:!!s,values,total:s?Object.values(s).reduce((a,b)=>a+b,0)/100:null});
 }
 return {categories:names,months:result};
}
