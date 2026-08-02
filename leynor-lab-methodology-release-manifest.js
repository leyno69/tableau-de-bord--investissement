function text(v,f){if(typeof v!=='string'||!v.trim())throw new TypeError(`${f} doit être une chaîne non vide.`);return v.trim();}
function list(v,f){if(!Array.isArray(v)||v.length===0)throw new TypeError(`${f} doit contenir au moins un élément.`);return Object.freeze([...new Set(v.map((x,i)=>text(x,`${f}[${i}]`)))].sort());}
function freeze(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;Object.values(v).forEach(freeze);return Object.freeze(v);}
export function createMethodologyReleaseManifest(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('input doit être un objet.');
 const status=text(input.status,'status');if(!['candidate','approved','withdrawn'].includes(status))throw new Error(`Statut de version inconnu : ${status}.`);
 const blockers=list(input.blockers??['none'],'blockers').filter(v=>v!=='none');
 if(status==='approved'&&blockers.length>0)throw new Error('Une version approuvée ne peut contenir aucun blocage actif.');
 return freeze({schemaVersion:1,releaseId:text(input.releaseId,'releaseId'),methodologyVersion:text(input.methodologyVersion,'methodologyVersion'),status,createdAt:text(input.createdAt,'createdAt'),commitSha:text(input.commitSha,'commitSha'),includedModules:list(input.includedModules,'includedModules'),includedDocuments:list(input.includedDocuments,'includedDocuments'),validationRunIds:list(input.validationRunIds,'validationRunIds'),blockers:Object.freeze(blockers),limitations:list(input.limitations,'limitations'),warning:'Méthodologie versionnée — aucune promesse de rendement ni recommandation d’investissement.'});
}
