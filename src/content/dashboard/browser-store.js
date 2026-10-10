const key='spending-public:ledger:v1';
export function readLedger(){const value=localStorage.getItem(key);if(!value)return {generation:'browser',revision:'empty',statements:[]};const data=JSON.parse(value);if(!Array.isArray(data.statements))throw Error('本地数据无法读取，请勿清空浏览器数据');return data;}
export function saveLedger(state){localStorage.setItem(key,JSON.stringify(state));}
export function metadata(state){return {...state,count:state.statements.reduce((n,s)=>n+s.rows.length,0),statements:state.statements.map(({rows,fileHash,...s})=>s)};}
