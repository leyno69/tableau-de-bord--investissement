function text(v,f){if(typeof v!=='string'||!v.trim())throw new TypeError(`${f} doit être une chaîne non vide.`);return v.trim();}
function freeze(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;Object.values(v).forEach(freeze);return Object.freeze(v);}
export function evaluateEvidencePublication(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('input doit être un objet.');
 const blockers=[];
 if(input.classificationStatus==='unclassified')blockers.push('evidence-unclassified');
 if(input.freshnessStatus!=='current')blockers.push('evidence-not-current');
 if(input.revoked===true)blockers.push('evidence-revoked');
 if(input.pipelineAuditStatus!=='coherent')blockers.push('pipeline-incoherent');
 if(input.contradictionsVisible!==true)blockers.push('contradictions-hidden');
 if(input.limitationsVisible!==true)blockers.push('limitations-hidden');
 return freeze({schemaVersion:1,publicationId:text(input.publicationId,'publicationId'),classificationId:text(input.classificationId,'classificationId'),policyId:text(input.policyId,'policyId'),policyVersion:text(input.policyVersion,'policyVersion'),status:blockers.length===0?'publishable':'blocked',blockers:Object.freeze(blockers.sort()),warning:'Information méthodologique — pas un conseil en investissement.'});
}
