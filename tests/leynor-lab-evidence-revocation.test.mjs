import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvidenceRevocation, createEvidenceRevocationRegistry } from '../leynor-lab-evidence-revocation.js';
const entry={revocationId:'rev-1',evidenceId:'ev-1',reasonCode:'source-withdrawn',reason:'La source a retiré le jeu de données.',revokedAt:'2026-08-02T15:00:00Z',authority:'methodology-board'};
test('crée une révocation immuable et bloquante',()=>{const r=createEvidenceRevocation(entry);assert.deepEqual(r.blockers,['evidence-revoked']);assert.ok(Object.isFrozen(r));});
test('indexe les preuves révoquées',()=>{const registry=createEvidenceRevocationRegistry([entry]);assert.equal(registry.isRevoked('ev-1'),true);assert.equal(registry.isRevoked('ev-2'),false);});
test('refuse les doublons et motifs inconnus',()=>{assert.throws(()=>createEvidenceRevocation({...entry,reasonCode:'other'}),/inconnu/);assert.throws(()=>createEvidenceRevocationRegistry([entry,{...entry,revocationId:'rev-2'}]),/déjà révoquée/);});
