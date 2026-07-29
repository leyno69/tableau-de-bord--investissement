import { deepFreeze, optionalTrimmedString, stableId } from './validation.mjs';

export function createAccount(input) {
  const id = stableId(input?.id, 'account.id');
  const envelope = optionalTrimmedString(input?.envelope, 'account.envelope');
  return deepFreeze({ id, envelope });
}
