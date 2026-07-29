import { invalid } from './errors.mjs';
import { deepFreeze, extensibleCode, stableId } from './validation.mjs';

const CONTEXTS = new Set(['REAL', 'SIMULATION']);

export function createCalculatedPosition(input) {
  const context = extensibleCode(input?.context, 'calculatedPosition.context');
  if (!CONTEXTS.has(context)) invalid('calculatedPosition.context', 'context must be REAL or SIMULATION', context);

  return deepFreeze({
    projectionId: stableId(input?.projectionId, 'calculatedPosition.projectionId'),
    calculationVersion: extensibleCode(input?.calculationVersion, 'calculatedPosition.calculationVersion'),
    instrumentId: stableId(input?.instrumentId, 'calculatedPosition.instrumentId'),
    accountId: stableId(input?.accountId, 'calculatedPosition.accountId'),
    context,
  });
}
