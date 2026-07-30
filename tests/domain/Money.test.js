import test from 'node:test';
import assert from 'node:assert/strict';

import { Money } from '../../domain/money/Money.js';

test('crée et normalise une somme monétaire immuable', () => {
  const money = new Money(10.25, ' eur ');

  assert.equal(money.amount, 10.25);
  assert.equal(money.currency, 'EUR');
  assert.equal(Object.isFrozen(money), true);
  assert.deepEqual(money.toJSON(), { amount: 10.25, currency: 'EUR' });
});

test('additionne et soustrait sans modifier les opérandes', () => {
  const initial = new Money(10, 'EUR');
  const result = initial.add(new Money(2.5, 'EUR')).subtract(new Money(1, 'EUR'));

  assert.deepEqual(result.toJSON(), { amount: 11.5, currency: 'EUR' });
  assert.equal(initial.amount, 10);
});

test('multiplie, inverse le signe et représente zéro', () => {
  const money = new Money(2.5, 'USD');

  assert.deepEqual(money.multiply(3).toJSON(), { amount: 7.5, currency: 'USD' });
  assert.deepEqual(money.negate().toJSON(), { amount: -2.5, currency: 'USD' });
  assert.equal(Money.zero('USD').isZero, true);
});

test('compare et teste l’égalité', () => {
  const ten = new Money(10, 'EUR');

  assert.equal(ten.equals(new Money(10, 'EUR')), true);
  assert.equal(ten.equals(new Money(10, 'USD')), false);
  assert.equal(ten.compare(new Money(9, 'EUR')), 1);
  assert.equal(ten.compare(new Money(10, 'EUR')), 0);
  assert.equal(ten.compare(new Money(11, 'EUR')), -1);
});

test('interdit toute opération entre devises différentes', () => {
  const euros = new Money(10, 'EUR');
  const dollars = new Money(10, 'USD');

  assert.throws(() => euros.add(dollars), /taux de change explicite/);
  assert.throws(() => euros.subtract(dollars), /taux de change explicite/);
  assert.throws(() => euros.compare(dollars), /taux de change explicite/);
});

test('refuse les montants, devises et opérandes invalides', () => {
  assert.throws(() => new Money(Number.NaN, 'EUR'), /nombre fini/);
  assert.throws(() => new Money(1, 'EURO'), /code ISO/);
  assert.throws(() => new Money(1, ''), /chaîne non vide/);
  assert.throws(() => new Money(1, 'EUR').add({ amount: 1 }), /instance de Money/);
  assert.throws(() => new Money(1, 'EUR').multiply(Infinity), /nombre fini/);
});

test('stabilise les erreurs classiques de virgule flottante', () => {
  const result = new Money(0.1, 'EUR').add(new Money(0.2, 'EUR'));

  assert.equal(result.amount, 0.3);
});
