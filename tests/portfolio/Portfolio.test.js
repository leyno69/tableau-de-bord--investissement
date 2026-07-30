import test from 'node:test';
import assert from 'node:assert/strict';

import { Portfolio } from '../../domain/portfolio/Portfolio.js';

const validProperties = {
  id: 'portfolio_main',
  name: 'Patrimoine principal',
  baseCurrency: 'EUR',
  status: Portfolio.STATUSES.ACTIVE
};

test('crée un portefeuille actif valide', () => {
  const portfolio = new Portfolio(validProperties);

  assert.equal(portfolio.id, 'portfolio_main');
  assert.equal(portfolio.name, 'Patrimoine principal');
  assert.equal(portfolio.baseCurrency, 'EUR');
  assert.equal(portfolio.isActive, true);
  assert.equal(portfolio.isArchived, false);
});

test('applique les valeurs par défaut et normalise la devise', () => {
  const portfolio = new Portfolio({
    id: ' portfolio_main ',
    name: ' Principal ',
    baseCurrency: 'eur'
  });

  assert.equal(portfolio.id, 'portfolio_main');
  assert.equal(portfolio.name, 'Principal');
  assert.equal(portfolio.baseCurrency, 'EUR');
  assert.equal(portfolio.status, Portfolio.STATUSES.ACTIVE);
});

test('représente explicitement un portefeuille archivé', () => {
  const portfolio = new Portfolio({
    ...validProperties,
    status: Portfolio.STATUSES.ARCHIVED
  });

  assert.equal(portfolio.isActive, false);
  assert.equal(portfolio.isArchived, true);
});

test('rend le portefeuille immuable', () => {
  const portfolio = new Portfolio(validProperties);

  assert.equal(Object.isFrozen(portfolio), true);
  assert.throws(() => {
    portfolio.name = 'Modifié';
  }, TypeError);
});

test('produit un objet sérialisable indépendant', () => {
  const portfolio = new Portfolio(validProperties);

  assert.deepEqual(portfolio.toJSON(), validProperties);
  assert.notEqual(portfolio.toJSON(), portfolio);
});

test('refuse les propriétés invalides', () => {
  assert.throws(() => new Portfolio(), /propriétés du portefeuille/);
  assert.throws(
    () => new Portfolio({ ...validProperties, id: ' ' }),
    /id doit être une chaîne non vide/
  );
  assert.throws(
    () => new Portfolio({ ...validProperties, baseCurrency: 'EURO' }),
    /code ISO composé de trois lettres/
  );
  assert.throws(
    () => new Portfolio({ ...validProperties, status: 'CLOSED' }),
    /status doit être l'une des valeurs/
  );
});
