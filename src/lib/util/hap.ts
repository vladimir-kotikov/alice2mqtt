export function makeLongUUID(shortUUID: string): string {
  return `${shortUUID}-0000-1000-8000-0026BB765291`;
}

export function makeShortUUID(longUUID: string): string {
  return longUUID.substr(0, 8);
}
