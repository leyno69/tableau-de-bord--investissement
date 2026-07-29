import { createTemporal } from './temporal.mjs';
import {
  currency,
  decimalString,
  deepFreeze,
  extensibleCode,
  optionalTrimmedString,
  stableId,
} from './validation.mjs';
import { invalid } from './errors.mjs';

const CONTEXTS = new Set(['REAL', 'SIMULATION']);

function moneyComponent(input, field) {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) invalid(field, `${field} must be an object`, input);
  return deepFreeze({
    amount: decimalString(input.amount, `${field}.amount`),
    currency: currency(input.currency, `${field}.currency`),
    category: optionalTrimmedString(input.category, `${field}.category`),
  });
}

function execution(input) {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) invalid('transaction.execution', 'execution must be an object', input);
  return deepFreeze({
    quantity: decimalString(input.quantity, 'transaction.execution.quantity', { positive: true }),
    price: decimalString(input.price, 'transaction.execution.price', { positive: true }),
    currency: currency(input.currency, 'transaction.execution.currency'),
  });
}

export function createTransaction(input) {
  const context = extensibleCode(input?.context, 'transaction.context');
  if (!CONTEXTS.has(context)) invalid('transaction.context', 'context must be REAL or SIMULATION', context);

  const fees = input?.fees ?? [];
  const taxes = input?.taxes ?? [];
  if (!Array.isArray(fees)) invalid('transaction.fees', 'fees must be an array', fees);
  if (!Array.isArray(taxes)) invalid('transaction.taxes', 'taxes must be an array', taxes);

  return deepFreeze({
    id: stableId(input?.id, 'transaction.id'),
    instrumentId: stableId(input?.instrumentId, 'transaction.instrumentId'),
    accountId: stableId(input?.accountId, 'transaction.accountId'),
    type: extensibleCode(input?.type, 'transaction.type'),
    temporal: createTemporal(input?.temporal),
    execution: execution(input?.execution),
    fees: fees.map((item, index) => moneyComponent(item, `transaction.fees[${index}]`)),
    taxes: taxes.map((item, index) => moneyComponent(item, `transaction.taxes[${index}]`)),
    source: deepFreeze({
      provider: optionalTrimmedString(input?.source?.provider, 'transaction.source.provider'),
      externalId: optionalTrimmedString(input?.source?.externalId, 'transaction.source.externalId'),
      ingestionBatchId: optionalTrimmedString(input?.source?.ingestionBatchId, 'transaction.source.ingestionBatchId'),
    }),
    context,
  });
}
