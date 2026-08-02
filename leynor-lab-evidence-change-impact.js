function text(v,f){if(typeof v!=='string'||!v.trim())throw new TypeError(`${f} doit être une chaîne non vide.`);return v.trim();}
function array(v,f){if(!Array.isArray(v))throw new TypeError(`${f} doit être un tableau.`);return v.map((x,i)=>text(x,`${f}[${i}]`));}
function freeze(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;Object.values(v).forEach(freeze);return Object.freeze(v);}
export function analyzeEvidenceChangeImpact(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('input doit être un objet.');
 const changedEvidenceIds=[...new Set(array(input.changedEvidenceIds,'changedEvidenceIds'))].sort();
 const relations=array(input.relations,'relations').map(value=>{const [evidenceId,targetType,targetId]=value.split('|');if(!evidenceId||!targetType||!targetId)throw new Error(`Relation invalide : ${value}.`);return {evidenceId,targetType,targetId};});
 const impacted=relations.filter(r=>changedEvidenceIds.includes(r.evidenceId)).map(r=>`${r.targetType}|${r.targetId}`);
 const unique=[...new Set(impacted)].sort();
 return freeze({schemaVersion:1,analysisId:text(input.analysisId,'analysisId'),changeSetId:text(input.changeSetId,'changeSetId'),changedEvidenceIds:Object.freeze(changedEvidenceIds),impactedTargets:Object.freeze(unique),requiresReclassification:unique.some(v=>v.startsWith('classification|')),requiresReportRefresh:unique.some(v=>v.startsWith('report|')),blockers:Object.freeze(unique.length===0?['unmapped-evidence-change']:[])});
}
