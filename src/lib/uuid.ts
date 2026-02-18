export function isValidUuid(value: string): boolean {
  // RFC 4122 version 1-5 UUID
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function assertValidUuid(value: string, label = "id"): asserts value is string {
  if (!isValidUuid(value)) {
    throw new Error(`Invalid ${label}: expected UUID, got '${value}'`);
  }
}
