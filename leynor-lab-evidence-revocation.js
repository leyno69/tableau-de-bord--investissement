function text(v,f){if(typeof v!=='string'||!v.trim())throw new TypeError(`${f} doit être une chaîne non vide.`);return v.trim();}
function freeze(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;Object.values(v).forEach(freeze);return Object.freeze(v);}
export function createEvidenceRevocation(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('input doit être un objet.');
 const reasonCode=text(input.reasonCode,'reasonCode');
 if(!['source-withdrawn','data-invalidated','methodology-superseded','integrity-issue'].includes(reasonCode))throw new Error(`Motif de révocation inconnu : ${reasonCode}.`);
 return freeze({schemaVersion:1,revocationId:text(input.revocationId,'revocationId'),evidenceId:text(input.evidenceId,'evidenceId'),reasonCode,reason:text(input.reason,'reason'),revokedAt:text(input.revokedAt,'revokedAt'),authority:text(input.authority,'authority'),replacementEvidenceId:input.replacementEvidenceId==null?null:text(input.replacementEvidenceId,'replacementEvidenceId'),blockers:Object.freeze(['evidence-revoked'])});
}
export function createEvidenceRevocationRegistry(entries=[]){
 const normalized=entries.map(createEvidenceRevocation);const ids=new Set();const evidence=new Set();
 for(const entry of normalized){if(ids.has(entry.revocationId))throw new Error(`revocationId dupliqué : ${entry.revocationId}.`);if(evidence.has(entry.evidenceId))throw new Error(`Preuve déjà révoquée : ${entry.evidenceId}.`);ids.add(entry.revocationId);evidence.add(entry.evidenceId);}
 const ordered=[...normalized].sort((a,b)=>a.revokedAt.localeCompare(b.revokedAt)||a.revocationId.localeCompare(b.revocationId));
 return freeze({schemaVersion:1,entries:ordered,isRevoked(evidenceId){return evidence.has(text(evidenceId,'evidenceId'));},add(input){return createEvidenceRevocationRegistry([...ordered,createEvidenceRevocation(input)]);}});
}
