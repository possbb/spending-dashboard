import * as pdfjs from 'pdfjs-dist';
import {hash,textLines,parseLines} from './browser-parser.js';
import {readLedger,saveLedger,metadata} from './browser-store.js';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdf.worker.min.mjs',document.baseURI).href;
export async function localRequest(path,body,revision){
 const current=readLedger();if(current.revision!==revision)throw Error('账单已在其他页面更新，请刷新后重试');
 if(path==='/api/clear'){const next={generation:crypto.randomUUID(),revision:crypto.randomUUID(),statements:[]};saveLedger(next);return {changed:true,results:[],ledger:metadata(next)};}
 const next={...current,statements:[...current.statements]},results=[];
 for(const file of body.getAll('files')){
  let pdf;
  try{
   if(!file.name.toLowerCase().endsWith('.pdf'))throw Error('仅支持PDF文件');
   const data=new Uint8Array(await file.arrayBuffer()),fileHash=await hash(data);
   if(next.statements.some(s=>s.fileHash===fileHash)){results.push({name:file.name,status:'跳过',detail:'此账单已导入（文件相同）'});continue;}
   pdf=await pdfjs.getDocument({data,cMapUrl:new URL('cmaps/',document.baseURI).href,cMapPacked:true,standardFontDataUrl:new URL('standard_fonts/',document.baseURI).href,isEvalSupported:false}).promise;
   if(pdf.numPages>100)throw Error('每份PDF最多100页');
   const pages=[];for(let i=1;i<=pdf.numPages;i++)pages.push(textLines((await (await pdf.getPage(i)).getTextContent()).items));
   const statement=await parseLines(pages,file.name,fileHash);
   if(next.statements.some(s=>s.id===statement.id)){results.push({name:file.name,status:'跳过',detail:'相同账期及交易已存在'});continue;}
   next.statements.push(statement);results.push({name:file.name,status:'成功',detail:`已导入${statement.count}条记录，对账通过`});
  }catch(e){results.push({name:file.name,status:'失败',detail:e.name==='PasswordException'?'请导入无密码PDF':e.message});}
  finally{if(pdf)await pdf.destroy();}
 }
 const changed=results.some(r=>r.status==='成功');
 if(changed){if(readLedger().revision!==revision)throw Error('其他页面已更新账单，请刷新后重试');next.revision=crypto.randomUUID();try{saveLedger(next);}catch{throw Error('浏览器存储空间不足，数据未保存；请减少导入数量');}}
 return {changed,results,ledger:metadata(changed?next:current)};
}
