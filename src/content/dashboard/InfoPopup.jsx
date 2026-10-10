import React, {useEffect,useRef,useState} from 'react';
export function InfoPopup({title,children}){
 const [open,setOpen]=useState(false);
 return <div className="sp-explanation sp-info-entry"><button type="button" className="sp-info-trigger" onClick={()=>setOpen(true)}>{title}</button>{open&&<InfoDialog title={title} close={()=>setOpen(false)}>{children}</InfoDialog>}</div>;
}
function InfoDialog({title,close,children}){
 const ref=useRef(null);
 useEffect(()=>{const previous=document.activeElement;ref.current.showModal();return()=>{if(previous?.isConnected)previous.focus();};},[]);
 return <dialog ref={ref} className="sp-info-dialog" aria-label={title} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget){const rect=e.currentTarget.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)close();}}}><header><h3>{title}</h3><button type="button" autoFocus aria-label="关闭说明浮窗" onClick={close}>✕</button></header><div className="sp-info-body">{children}</div></dialog>;
}
