import React,{useEffect,useRef,useState} from 'react';
import {categoryColor,monthlyData} from './monthly-data.js';
export function MonthlyTrend({rows,field,currency,month,onMonth}){
 const model=monthlyData(rows,field),[mode,setMode]=useState('bar'),[hidden,setHidden]=useState([]),[hover,setHover]=useState(null),[width,setWidth]=useState(500),ref=useRef(null);
 useEffect(()=>{const observer=new ResizeObserver(entries=>setWidth(Math.max(260,entries[0].contentRect.width)));observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const categories=model.categories.filter(c=>!hidden.includes(c)),months=model.months;
 const max=Math.max(1,...months.map(m=>categories.reduce((s,c)=>s+Math.max(0,m.values[c]||0),0))),min=Math.min(0,...months.map(m=>categories.reduce((s,c)=>s+Math.min(0,m.values[c]||0),0)));
 const lo=min<0?min*1.2:0,hi=max*1.15,h=300,l=55,r=12,t=28,b=34,pw=width-l-r,ph=h-t-b;
 const y=v=>t+(hi-v)/(hi-lo)*ph,x=i=>l+(i+.5)*pw/Math.max(1,months.length),bar=Math.min(40,pw/Math.max(1,months.length)*.55);
 const round=v=>Math.round(v).toLocaleString('zh-CN');
 const ticks=Array.from({length:5},(_,i)=>lo+(hi-lo)*i/4);
 const active=months.find(m=>m.month===hover);
 const select=m=>{if(m.available)onMonth(m.month===month?'all':m.month);};
 return <div className="sp-monthly" data-reviewed-rows ref={ref}>
 <div className="sp-trend-toolbar"><span>按交易月 · {currency}</span><div role="group" aria-label="趋势图类型"><button type="button" aria-pressed={mode==='bar'} onClick={()=>setMode('bar')}>柱状图</button><button type="button" aria-pressed={mode==='line'} onClick={()=>setMode('line')}>折线图</button></div></div>
 <svg viewBox={`0 0 ${width} ${h}`} role="img" aria-label={`${currency}月度一级分类净消费${mode==='bar'?'堆叠柱状图':'折线图'}`} onMouseLeave={()=>setHover(null)}>
 {ticks.map((v,i)=><g key={i}><line x1={l} x2={width-r} y1={y(v)} y2={y(v)} stroke="currentColor" opacity=".1"/><text x={l-8} y={y(v)+4} textAnchor="end" fill="currentColor" fontSize="11">{round(v)}</text></g>)}
 <line x1={l} x2={width-r} y1={y(0)} y2={y(0)} stroke="currentColor" opacity=".25"/>
 {months.map((m,i)=><g key={m.month}>{m.month===month&&<rect x={x(i)-pw/months.length/2} y={t} width={pw/months.length} height={ph} fill="#6868ff" opacity=".07"/>}{!m.available&&<text x={x(i)} y={y(0)-8} textAnchor="middle" fill="currentColor" fontSize="11">—</text>}</g>)}
 {mode==='bar'?months.map((m,i)=>{let pos=0,neg=0;return <g key={m.month}>{m.available&&categories.map(c=>{const v=m.values[c]||0,start=v>=0?pos:neg;if(v>=0)pos+=v;else neg+=v;return <rect key={c} x={x(i)-bar/2} y={y(Math.max(start,start+v))} width={bar} height={Math.abs(y(start+v)-y(start))} fill={categoryColor(c)}/>;})}{m.available&&(months.length<=Math.floor(pw/55)||m.month===month)&&<text x={x(i)} y={y(pos)-8} textAnchor="middle" fill="currentColor" fontSize="11">{round(categories.reduce((s,c)=>s+(m.values[c]||0),0))}</text>}</g>;}):categories.map(c=>{let connected=false;const d=months.map((m,i)=>{if(!m.available){connected=false;return '';}const part=`${connected?'L':'M'}${x(i)},${y(m.values[c]||0)}`;connected=true;return part;}).join(' ');return <g key={c}><path d={d} fill="none" stroke={categoryColor(c)} strokeWidth="2.5"/>{months.map((m,i)=>m.available&&<circle key={m.month} cx={x(i)} cy={y(m.values[c]||0)} r="3" fill={categoryColor(c)}/>)}</g>;})}
 {months.map((m,i)=><g key={m.month}><text x={x(i)} y={h-10} textAnchor="middle" fill="currentColor" fontSize="11">{i%Math.max(1,Math.ceil(months.length/Math.max(1,Math.floor(pw/65))))===0?m.month:''}</text><rect x={x(i)-pw/months.length/2} y={t} width={pw/months.length} height={ph} fill="transparent" className="sp-month-hit" onMouseEnter={()=>setHover(m.month)} onClick={()=>select(m)}/></g>)}
 </svg>
 <div className="sp-month-buttons" aria-label="选择趋势月份">{months.map(m=><button type="button" key={m.month} disabled={!m.available} aria-pressed={month===m.month} onFocus={()=>setHover(m.month)} onBlur={()=>setHover(null)} onClick={()=>select(m)}>{m.month}{!m.available?' 无数据':''}</button>)}<button type="button" aria-pressed={month==='all'} onClick={()=>onMonth('all')}>全部月份</button></div>
 <div className="sp-trend-legend" aria-label="筛选趋势分类">{model.categories.map(c=><button key={c} type="button" aria-pressed={!hidden.includes(c)} onClick={()=>setHidden(old=>old.includes(c)?old.filter(v=>v!==c):[...old,c])}><i style={{background:categoryColor(c)}}/>{c}</button>)}</div>
 {active&&<div className="sp-trend-tooltip" role="status"><b>{active.month} · {active.available?`全分类净消费 ${currency} ${round(active.total)}`:'暂无录入数据'}</b>{active.available&&categories.map(c=><span key={c}><i style={{background:categoryColor(c)}}/>{c}<strong>{currency} {round(active.values[c]||0)}</strong></span>)}</div>}
 {months.filter(m=>m.available).length===1&&<small>当前仅有一个月的数据，录入更多月份后可比较趋势。</small>}
 <details className="sp-trend-help"><summary>统计说明</summary><small>仅统计已录入记录；空缺月份不视为零消费。点击月份联动左图与明细；隐藏分类仅影响趋势图。</small></details>
 </div>;
}
