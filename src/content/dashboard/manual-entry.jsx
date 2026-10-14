import React,{useEffect,useRef,useState} from 'react';
import {labels,subChoices} from './category-editor.jsx';
import {currencies,saveManualEntry} from './manual-store.js';
export function ManualEntry({revision,disabled}){
 const [open,setOpen]=useState(false);
 return <><button type="button" disabled={disabled} onClick={()=>setOpen(true)}>手工录入账单</button>{open&&<EntryDialog revision={revision} close={()=>setOpen(false)}/>}</>;
}
function EntryDialog({revision,close}){
 const ref=useRef(null),saving=useRef(false);
 const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const [form,setForm]=useState({date:today,merchant:'',amount:'',currency:'EUR',billedCurrency:'EUR',billedAmount:'',kind:'消费',category:labels[0],subcategory:subChoices(labels[0])[0],note:''});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const previous=document.activeElement;ref.current.showModal();return()=>{if(previous?.isConnected)previous.focus();};},[]);
 const change=(key,value)=>setForm(f=>({...f,[key]:value,...(key==='category'?{subcategory:subChoices(value)[0]}:{}),...(key==='currency'&&f.currency===f.billedCurrency?{billedCurrency:value}:{})}));
 function submit(event){event.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setError('');try{saveManualEntry(form,revision);try{sessionStorage.setItem('spending-public:import-receipt:v1',JSON.stringify([{status:'成功',name:'手工录入',detail:`已保存 ${form.merchant}；已纳入统计，非欧元记录可切换顶部币种查看`} ]));}catch{}window.location.reload();}catch(e){setError(e.message);setBusy(false);saving.current=false;}}
 return <dialog ref={ref} className="sp-info-dialog sp-manual-dialog" aria-label="手工录入账单" onCancel={e=>{e.preventDefault();if(!busy)close();}}><header><h3>手工录入账单</h3><button type="button" aria-label="关闭录入表单" disabled={busy} onClick={close}>✕</button></header><form onSubmit={submit} className="sp-manual-form">
 <label>交易日期<input autoFocus required type="date" value={form.date} onChange={e=>change('date',e.target.value)}/></label>
 <label>类型<select value={form.kind} onChange={e=>change('kind',e.target.value)}>{['消费','退款'].map(v=><option key={v}>{v}</option>)}</select></label>
 <label className="sp-manual-wide">商户名称<input required maxLength={100} value={form.merchant} onChange={e=>change('merchant',e.target.value)} placeholder="填写商户原始名称"/></label>
 <label>交易金额<input required type="number" min="0.01" max="999999999.99" step="0.01" inputMode="decimal" value={form.amount} onChange={e=>change('amount',e.target.value)}/></label>
 <label>交易币种<select value={form.currency} onChange={e=>change('currency',e.target.value)}>{currencies.map(v=><option key={v}>{v}</option>)}</select></label>
 <label>一级分类<select value={form.category} onChange={e=>change('category',e.target.value)}>{labels.map(v=><option key={v}>{v}</option>)}</select></label>
 <label>二级分类<select value={form.subcategory} onChange={e=>change('subcategory',e.target.value)}>{subChoices(form.category).map(v=><option key={v}>{v}</option>)}</select></label>
 <label>入账币种<select value={form.billedCurrency} onChange={e=>change('billedCurrency',e.target.value)}>{currencies.map(v=><option key={v}>{v}</option>)}</select></label>
 {form.currency!==form.billedCurrency&&<label>实际入账金额<input required type="number" min="0.01" max="999999999.99" step="0.01" inputMode="decimal" value={form.billedAmount} onChange={e=>change('billedAmount',e.target.value)}/></label>}
 <label className="sp-manual-wide">中文说明 / 备注（选填）<textarea maxLength={300} rows={2} value={form.note} onChange={e=>change('note',e.target.value)}/></label>
 <small className="sp-manual-wide">消费和退款均填写正数；退款自动扣减。记录归入独立手工账户，仅保存在当前浏览器，不与银行账单自动去重。</small>
 {error&&<p className="sp-manual-wide sp-import-error" role="alert">{error}</p>}
 <div className="sp-category-footer sp-manual-wide"><button type="button" disabled={busy} onClick={close}>取消</button><button type="submit" disabled={busy}>{busy?'正在保存…':'保存并更新统计'}</button></div>
 </form></dialog>;
}
