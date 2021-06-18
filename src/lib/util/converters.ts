export function ensureValueInInterval(
  value: number,
  lowerBoundary: number,
  upperBoundary: number
): number {
  return Math.max(lowerBoundary, Math.min(upperBoundary, value));
}

export function mireds2Kelvin(mireds: number): number {
  // color temperature in micro-reciprocal degrees (mired) is 1,000,000
  // divided by the color temperature in kelvins. For example, to emulate a
  // traditional tungsten light with a color temperature of 3200 K, use a
  // mired value of about 312.
  return Math.floor(1000000 / mireds);
}
