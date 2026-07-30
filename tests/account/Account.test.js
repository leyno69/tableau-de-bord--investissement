import test from 'node:test';
import assert from 'node:assert/strict';

import { Account } from '../../domain/account/Account.js';

const validAccountProperties = {
  id: 'account_trade_republic_cto',
  portfolioId: 'portfolio_main',
  name: 'Trade Republic — CTO',
  providerId: 'TRADE_REPUBLIC',
  kind: Account.KINDS.SECURITIES,
  taxWrapper: Account.TAX_WRAPPERS.CTO,
  currency: 'EUR',
  status: Account.STATUSES.ACTIVE,
  externalId: 'tr_account_001',
  metadata: {
    import: {
      source: 'manual'
    },
    labels: ['principal']
  }
};

test('crée un compte titres valide', () => {
  const account = new Account(validAccountProperties);

  assert.equal(account.id, 'account_trade_republic_cto');
  assert.equal(account.portfolioId, 'portfolio_main');
  assert.equal(account.providerId, 'TRADE_REPUBLIC');
  assert.equal(account.kind, Account.KINDS.SECURITIES);
  assert.equal(account.taxWrapper, Account.TAX_WRAPPERS.CTO);
  assert.equal(account.currency, 'EUR');
  assert.equal(account.isActive, true);
  assert.equal(account.isClosed, false);
  assert.equal(account.isSecuritiesAccount, true);
  assert.equal(account.isCashAccount, false);
});

test('crée un compte espèces distinct du compte titres', () => {
  const account = new Account({
    ...validAccountProperties,
    id: 'account_revolut_cash_usd',
    name: 'Revolut — Espèces USD',
    providerId: 'REVOLUT',
    kind: Account.KINDS.CASH,
    taxWrapper: Account.TAX_WRAPPERS.NONE,
    currency: 'USD'
  });

  assert.equal(account.isCashAccount, true);
  assert.equal(account.isSecuritiesAccount, false);
  assert.equal(account.currency, 'USD');
});

test('applique les valeurs par défaut compatibles', () => {
  const account = new Account({
    id: 'account_pea',
    portfolioId: 'portfolio_main',
    name: 'PEA',
    providerId: 'BROKER',
    kind: Account.KINDS.SECURITIES
  });

  assert.equal(account.taxWrapper, Account.TAX_WRAPPERS.NONE);
  assert.equal(account.currency, 'EUR');
  assert.equal(account.status, Account.STATUSES.ACTIVE);
  assert.equal(account.externalId, null);
  assert.deepEqual(account.metadata, {});
});

test('normalise les chaînes et la devise', () => {
  const account = new Account({
    ...validAccountProperties,
    id: '  account_001  ',
    name: '  Compte principal  ',
    providerId: '  REVOLUT  ',
    currency: 'usd'
  });

  assert.equal(account.id, 'account_001');
  assert.equal(account.name, 'Compte principal');
  assert.equal(account.providerId, 'REVOLUT');
  assert.equal(account.currency, 'USD');
});

test('rend le compte et ses métadonnées immuables', () => {
  const sourceMetadata = {
    nested: {
      enabled: true
    },
    labels: ['principal']
  };
  const account = new Account({
    ...validAccountProperties,
    metadata: sourceMetadata
  });

  sourceMetadata.nested.enabled = false;
  sourceMetadata.labels.push('modifié');

  assert.equal(Object.isFrozen(account), true);
  assert.equal(Object.isFrozen(account.metadata), true);
  assert.equal(Object.isFrozen(account.metadata.nested), true);
  assert.equal(Object.isFrozen(account.metadata.labels), true);
  assert.equal(account.metadata.nested.enabled, true);
  assert.deepEqual(account.metadata.labels, ['principal']);
  assert.throws(() => {
    account.name = 'Nouveau nom';
  }, TypeError);
  assert.throws(() => {
    account.metadata.nested.enabled = false;
  }, TypeError);
});

test('produit une copie sérialisable indépendante', () => {
  const account = new Account(validAccountProperties);
  const serialized = account.toJSON();

  assert.deepEqual(serialized, validAccountProperties);
  assert.notEqual(serialized, account);
  assert.notEqual(serialized.metadata, account.metadata);
  assert.notEqual(serialized.metadata.import, account.metadata.import);

  serialized.metadata.import.source = 'connector';
  assert.equal(account.metadata.import.source, 'manual');
});

test('représente explicitement un compte fermé', () => {
  const account = new Account({
    ...validAccountProperties,
    status: Account.STATUSES.CLOSED
  });

  assert.equal(account.isActive, false);
  assert.equal(account.isClosed, true);
});

test('refuse un identifiant manquant', () => {
  assert.throws(
    () => new Account({ ...validAccountProperties, id: ' ' }),
    /id doit être une chaîne non vide/
  );
});

test('refuse un type de compte inconnu', () => {
  assert.throws(
    () => new Account({ ...validAccountProperties, kind: 'CRYPTO' }),
    /kind doit être l'une des valeurs/
  );
});

test('refuse une enveloppe fiscale inconnue', () => {
  assert.throws(
    () => new Account({ ...validAccountProperties, taxWrapper: 'ASSURANCE_VIE' }),
    /taxWrapper doit être l'une des valeurs/
  );
});

test('refuse une devise invalide', () => {
  assert.throws(
    () => new Account({ ...validAccountProperties, currency: 'EURO' }),
    /code ISO composé de trois lettres/
  );
});

test('refuse des métadonnées non sérialisables', () => {
  assert.throws(
    () => new Account({ ...validAccountProperties, metadata: { importedAt: new Date() } }),
    /valeurs JSON sérialisables/
  );

  assert.throws(
    () => new Account({ ...validAccountProperties, metadata: { ratio: Number.NaN } }),
    /valeurs JSON sérialisables/
  );

  assert.throws(
    () => new Account({ ...validAccountProperties, metadata: [] }),
    /metadata doit être un objet simple/
  );
});
