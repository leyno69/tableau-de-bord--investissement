import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEvidencePublication } from '../leynor-lab-evidence-publication-gate.js';
const base={publicationId:'pub-1',classificationId:'class-1',policyId:'publication-policy',policyVersion:'1.0.0',classificationStatus:'classified',freshnessStatus:'current',revoked:false,pipelineAuditStatus:'coherent',contradictionsVisible:true,limitationsVisible:true};
test('autorise une publication complète',()=>{const r=evaluateEvidencePublication(base);assert.equal(r.status,'publishable');assert.deepEqual(r.blockers,[]);});
test('bloque une preuve périmée ou révoquée',()=>{const r=evaluateEvidencePublication({...base,freshnessStatus:'stale',revoked:true});assert.equal(r.status,'blocked');assert.deepEqual(r.blockers,['evidence-not-current','evidence-revoked']);});
test('bloque la dissimulation des limites et contradictions',()=>{const r=evaluateEvidencePublication({...base,contradictionsVisible:false,limitationsVisible:false});assert.deepEqual(r.blockers,['contradictions-hidden','limitations-hidden']);assert.match(r.warning,/pas un conseil/);});
