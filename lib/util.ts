import { HapCharacteristicType } from "../types/hap";
import { ServiceJsonObject } from "../types/hap-nodejs_internal";


export function getCharacteristic<T>(
    service: Maybe<ServiceJsonObject>, characteristicType: HapCharacteristicType,
): Maybe<T> {
    const char = service?.characteristics.find(({ type }) => type === characteristicType);
    if (!char) {
        return;
    }

    return char !== undefined ? char.value as unknown as T : char;
}

export function mireds2Kelvin(mireds: number): number {
    // color temperature in micro-reciprocal degrees (mired) is 1,000,000
    // divided by the color temperature in kelvins. For example, to emulate a
    // traditional tungsten light with a color temperature of 3200 K, use a
    // mired value of about 312.
    return Math.floor(1000000 / mireds);
}

export function enumNameByValue(enumClass: any, value: any): Maybe<string> {
    return Object.keys(enumClass).find(key => enumClass[key] === value);
}
