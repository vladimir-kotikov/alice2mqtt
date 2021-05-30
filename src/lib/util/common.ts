import { HapCharacteristicType } from "../../types/hap";
import { ServiceJsonObject } from "../../types/hap-nodejs_internal";

export function getCharacteristic<T>(
  service: Maybe<ServiceJsonObject>,
  characteristicType: HapCharacteristicType
): Maybe<T> {
  const characteristic = service?.characteristics.find(({ type }) => type === characteristicType);
  if (!characteristic) {
    return;
  }

  return characteristic !== undefined ? (characteristic.value as unknown as T) : characteristic;
}

export function mireds2Kelvin(mireds: number): number {
  // color temperature in micro-reciprocal degrees (mired) is 1,000,000
  // divided by the color temperature in kelvins. For example, to emulate a
  // traditional tungsten light with a color temperature of 3200 K, use a
  // mired value of about 312.
  return Math.floor(1000000 / mireds);
}

export function enumNameByValue<T>(enumClass: Record<string, T>, value: T): Maybe<string> {
  return Object.keys(enumClass).find((key) => enumClass[key] === value);
}

export function asyncMap<T, U>(collection: T[], mapFn: (arg: T) => Promise<U>): Promise<U[]> {
  return Promise.all(collection.map((item) => mapFn(item)));
}
