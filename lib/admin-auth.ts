export function isAdminAuthorizedByKey(
  providedKey: string | null,
  expectedKey: string | undefined
): boolean {
  return Boolean(expectedKey) && providedKey === expectedKey;
}
