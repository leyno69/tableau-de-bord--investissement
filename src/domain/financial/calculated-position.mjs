import { deepFreeze, extensibleCode, stableId } from './validation.mjs';

export function createCalculatedPosition(input) {
  return deepFreeze({
    projectionId: stableId(input?.projectionId, 'calculatedPosition.projectionId'),
    calculationVersion: extensibleCode(input?.calculationVersion, 'calculatedPosition.calculationVersion'),
    instrumentId: stableId(input?.instrumentId, 'calculatedPosition.instrumentId'),
    accountId: stableId(input?.accountId, 'calculatedPosition.accountId'),
    context: extensibleCode(input?.context, 'calculatedPosition.context'),
  });
}
