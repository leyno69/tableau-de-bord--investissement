import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeEvidenceChangeImpact } from '../leynor-lab-evidence-change-impact.js';
const base={analysisId:'impact-1',changeSetId:'change-1',changedEvidenceIds:['ev-1'],relations:['ev-1|classification|class-1','ev-1|report|report-1','ev-2|report|report-2']};
test('identifie les classifications et rapports impactés',()=>{const r=analyzeEvidenceChangeImpact(base);assert.deepEqual(r.impactedTargets,['classification|class-1','report|report-1']);assert.equal(r.requiresReclassification,true);assert.equal(r.requiresReportRefresh,true);});
test('bloque un changement sans relation',()=>{const r=analyzeEvidenceChangeImpact({...base,changedEvidenceIds:['ev-x']});assert.deepEqual(r.blockers,['unmapped-evidence-change']);});
test('refuse les relations invalides',()=>{assert.throws(()=>analyzeEvidenceChangeImpact({...base,relations:['bad']}),/Relation invalide/);});
