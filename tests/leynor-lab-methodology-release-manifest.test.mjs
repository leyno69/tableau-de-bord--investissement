import test from 'node:test';
import assert from 'node:assert/strict';
import { createMethodologyReleaseManifest } from '../leynor-lab-methodology-release-manifest.js';
const base={releaseId:'methodology-1.0.0',methodologyVersion:'1.0.0',status:'candidate',createdAt:'2026-08-02T15:00:00Z',commitSha:'cb1cbc59',includedModules:['classification','freshness','revocation','publication'],includedDocuments:['docs/methodology/PUBLICATION_PREUVES.md'],validationRunIds:['ci-374','domain-493'],blockers:['none'],limitations:['Les campagnes empiriques restent nécessaires.']};
test('fige un manifeste déterministe',()=>{const r=createMethodologyReleaseManifest(base);assert.deepEqual(r.includedModules,['classification','freshness','publication','revocation']);assert.deepEqual(r.blockers,[]);assert.ok(Object.isFrozen(r));});
test('refuse une version approuvée avec blocages',()=>{assert.throws(()=>createMethodologyReleaseManifest({...base,status:'approved',blockers:['missing-holdout']}),/aucun blocage/);});
test('conserve les limites et avertissements',()=>{const r=createMethodologyReleaseManifest({...base,status:'approved'});assert.match(r.warning,/aucune promesse/);assert.equal(r.limitations.length,1);});
