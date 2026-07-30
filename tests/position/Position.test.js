import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Position
} from '../../domain/position/Position.js';

const validPositionProperties = {
  assetId: 'IE0002XZSHO1',
  quantity: 10,
  totalCost: 65,
  averageCost: 6.5,
  realizedPnL: 0,
  dividends: 0,
  currency: 'EUR'
};

test('crée une position avec les valeurs fournies', () => {
  const position = new Position(validPositionProperties);

  assert.equal(position.assetId, 'IE0002XZSHO1');
  assert.equal(position.quantity, 10);
  assert.equal(position.totalCost, 65);
  assert.equal(position.averageCost, 6.5);
  assert.equal(position.realizedPnL, 0);
  assert.equal(position.dividends, 0);
  assert.equal(position.currency, 'EUR');
});

test('utilise les valeurs par défaut', () => {
  const position = new Position({
    assetId: 'FR0011869312'
  });

  assert.equal(position.quantity, 0);
  assert.equal(position.totalCost, 0);
  assert.equal(position.averageCost, 0);
  assert.equal(position.realizedPnL, 0);
  assert.equal(position.dividends, 0);
  assert.equal(position.currency, 'EUR');
});

test('expose le capital investi', () => {
  const position = new Position(validPositionProperties);

  assert.equal(position.investedCapital, 65);
});

test('indique si une position est ouverte', () => {
  const openPosition = new Position(validPositionProperties);
  const closedPosition = new Position({
    ...validPositionProperties,
    quantity: 0
  });

  assert.equal(openPosition.hasPosition, true);
  assert.equal(closedPosition.hasPosition, false);
});

test('rend la position immuable', () => {
  const position = new Position(validPositionProperties);

  assert.equal(Object.isFrozen(position), true);

  assert.throws(() => {
    position.quantity = 100;
  }, TypeError);

  assert.equal(position.quantity, 10);
});

test('produit un objet sérialisable', () => {
  const position = new Position(validPositionProperties);
  const serialized = position.toJSON();

  assert.deepEqual(serialized, validPositionProperties);
  assert.notEqual(serialized, position);
});
