import base from '../../data.json';
import {readLedger,metadata} from './browser-store.js';
const state=readLedger();
export default {...base,ledger:metadata(state),queries:{...base.queries,transactions:{...base.queries.transactions,rows:state.statements.flatMap(s=>s.rows)}}};
