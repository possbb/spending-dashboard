import {InfoPopup} from './InfoPopup.jsx';
import React, {createContext, useContext, useEffect, useState} from 'react';

const baseStorageKey='spending-public:categories:v1';
const categoryKey=generation=>generation==='initial'?baseStorageKey:baseStorageKey+':'+generation;
export function clearSavedCategories(generation){try{localStorage.removeItem(categoryKey(generation));}catch{}}
export const labels=['超市与食品','餐饮与咖啡','家居与日用品','公共交通','游戏娱乐','服饰鞋包','医疗健康','教育学习','旅游住宿','通讯与订阅','美团·用途待确认','待确认','其他消费'];
const subcategories={
 '超市与食品':['综合超市','亚洲食品店','生鲜食品店','待细分'],
 '餐饮与咖啡':['餐厅','咖啡与甜品','自动售货机','待细分'],
 '家居与日用品':['家居卖场','日用百货店','家具','厨具餐具','清洁用品','待细分'],
 '公共交通':['地铁','公交','火车','待细分'],
 '游戏娱乐':['电子游戏','影视娱乐','线下娱乐','待细分'],
 '服饰鞋包':['服装','鞋履','箱包配饰','待细分'],
 '医疗健康':['药品','诊疗','待细分'],
 '教育学习':['学费','书籍文具','培训课程','待细分'],
 '旅游住宿':['住宿','机票','景点门票','待细分'],
 '通讯与订阅':['电话网络','软件订阅','待细分']
};
export const subChoices=category=>subcategories[category]||['待细分'];
function inferredSubcategory(row,category){
 const m=row.merchant.toUpperCase();
 if(category!==row.category)return '待细分';
 if(row.sourceType==='manual' && subChoices(category).includes(row.subcategory))return row.subcategory;
 if(category==='超市与食品')return /TOKYOYA|LEE ASIAN/.test(m)?'亚洲食品店':'综合超市';
 if(category==='餐饮与咖啡')return /ARBITRADE/.test(m)?'自动售货机':/CAFE|COFFEE|GELATO|SANA LOCURA/.test(m)?'咖啡与甜品':'餐厅';
 if(category==='家居与日用品')return /IKEA/.test(m)?'家居卖场':/BAZAR|BASAR/.test(m)?'日用百货店':'待细分';
 if(category==='公共交通'&&/METRO/.test(m))return '地铁';
 if(category==='游戏娱乐'&&/NINTENDO/.test(m))return '电子游戏';
 return '待细分';
}
export function SubcategoryAction({rows}){
 const editor=useContext(EditorContext);
 if(!editor||!rows.every(r=>['消费','退款'].includes(r.kind)))return null;
 return <select className="sp-category-button sp-subcategory-button" aria-label={`变更 ${rows[0].merchant} 当前分组 ${rows.length} 笔二级分类`} value={rows[0].subcategory||'待细分'} onClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();editor.applySub(e.target.value,rows);}}>{subChoices(rows[0].category).map(x=><option key={x} value={x}>{x}</option>)}</select>;
}
const EditorContext=createContext(null);
function readSaved(storageKey){try{const value=JSON.parse(localStorage.getItem(storageKey)||'{}');return value && typeof value==='object' && !Array.isArray(value)?value:{};}catch{return {};}}
export function CategoryAction({rows,merchant=false}){
 const editor=useContext(EditorContext);
 if(!editor || !rows.every(r=>['消费','退款'].includes(r.kind)))return null;
 return <select className="sp-category-button" aria-label={merchant?`变更 ${rows[0].merchant} 当前分组 ${rows.length} 笔分类`:`变更 ${rows[0].id} 分类`} value={merchant?'':rows[0].category} onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()} onChange={event=>{event.stopPropagation();editor.apply(event.target.value==='__reset'?null:event.target.value,rows);}}>{merchant && <option value="" disabled>变更分类</option>}{editor.choices.map(label=><option key={label} value={label}>{label}{merchant && rows.every(r=>r.category===label)?'（当前）':''}</option>)}<option value="__reset">恢复原分类</option></select>;
}
export function CategoryEditor({rows,children,generation='initial'}){
 const storageKey=categoryKey(generation);
 const [saved,setSaved]=useState(()=>readSaved(storageKey)),[message,setMessage]=useState(''),[undo,setUndo]=useState(null);
 useEffect(()=>{const update=e=>{if(e.key===storageKey){setSaved(readSaved(storageKey));setUndo(null);}};window.addEventListener('storage',update);return()=>window.removeEventListener('storage',update);},[]);
 const choices=[...new Set([...rows.filter(r=>['消费','退款'].includes(r.kind)).map(r=>r.category),...labels])];
 const effective=rows.map(r=>{const category=choices.includes(saved[r.id])?saved[r.id]:r.category;const sub=saved['sub:'+r.id];const subcategory=sub?.category===category&&subChoices(category).includes(sub.value)?sub.value:inferredSubcategory(r,category);return {...r,category,subcategory,originalCategory:r.category,categorySource:category===r.category?'商户名称暂分类':'用户手动分类（当前浏览器）',note:category===r.category?r.note:`用户改为「${category}」；原分类：${r.category}。原说明：${r.note}`};});
 function persist(next,text){try{localStorage.setItem(storageKey,JSON.stringify(next));setSaved(next);setMessage(text);return true;}catch{setMessage('保存失败，分类未变更。请检查浏览器本地存储是否可用。');return false;}}
 function apply(category,targetRows){const next={...saved};for(const r of targetRows){const original=rows.find(x=>x.id===r.id);if(category===null || category===original.category)delete next[r.id];else next[r.id]=category;}if(persist(next,`已${category===null?'恢复原分类':`改为「${category}」`}：${targetRows.length}笔；统计已更新并保存。`)){setUndo(saved);}}
 function applySub(value,targetRows){const next={...saved};for(const r of targetRows)next['sub:'+r.id]={category:r.category,value};if(persist(next,`已将 ${targetRows.length} 笔二级分类改为「${value}」，统计已更新并保存。`))setUndo(saved);}
 const changed=effective.filter(r=>r.category!==r.originalCategory).length;
 return <EditorContext.Provider value={{apply,applySub,choices}}><div className="sp-category-help"><InfoPopup title="分类操作说明"><p>点击“变更分类”可批量调整当前商户分组；逐笔明细可单独改。二级分类默认按商户类型推断，可用下拉菜单更正；无法识别具体商品时不按商品用途猜测。已修改 {changed} 笔，仅保存在当前浏览器。</p></InfoPopup>{undo!==null && <button type="button" onClick={()=>{if(persist(undo,'已撤销上次分类变更。'))setUndo(null);}}>撤销上次变更</button>}<span role="status">{message}</span></div>{children(effective)}</EditorContext.Provider>;
}
