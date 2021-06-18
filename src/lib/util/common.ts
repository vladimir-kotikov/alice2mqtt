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

export function enumNameByValue<T>(enumClass: Record<string, T>, value: T): Maybe<string> {
  return Object.keys(enumClass).find((key) => enumClass[key] === value);
}

export function asyncMap<T, U>(collection: T[], mapFn: (arg: T) => Promise<U>): Promise<U[]> {
  return Promise.all(collection.map((item) => mapFn(item)));
}
