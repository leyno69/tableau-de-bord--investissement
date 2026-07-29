import {
  currency,
  deepFreeze,
  extensibleCode,
  optionalIsin,
  optionalTrimmedString,
  stableId,
} from './validation.mjs';
import { createTemporal } from './temporal.mjs';
import { invalid } from './errors.mjs';

function createProviderMapping(mapping, index) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    invalid(`providerMappings[${index}]`, 'provider mapping must be an object', mapping);
  }
  return deepFreeze({
    provider: stableId(mapping.provider, `providerMappings[${index}].provider`),
    symbol: optionalTrimmedString(mapping.symbol, `providerMappings[${index}].symbol`),
    externalId: optionalTrimmedString(mapping.externalId, `providerMappings[${index}].externalId`),
    validFrom: mapping.validFrom == null ? null : createTemporal(mapping.validFrom),
    validTo: mapping.validTo == null ? null : createTemporal(mapping.validTo),
  });
}

export function createInstrument(input) {
  const mappings = input?.providerMappings ?? [];
  if (!Array.isArray(mappings)) invalid('instrument.providerMappings', 'providerMappings must be an array', mappings);

  return deepFreeze({
    id: stableId(input?.id, 'instrument.id'),
    type: extensibleCode(input?.type, 'instrument.type'),
    isin: optionalIsin(input?.isin, 'instrument.isin'),
    ticker: optionalTrimmedString(input?.ticker, 'instrument.ticker'),
    venue: optionalTrimmedString(input?.venue, 'instrument.venue'),
    currency: currency(input?.currency, 'instrument.currency'),
    providerMappings: mappings.map(createProviderMapping),
  });
}
