import { Perms, Formats, Units } from "hap-nodejs";

// From hap-nodejs https://github.com/homebridge/HAP-NodeJS/blob/master/src/internal-types.ts

type PrimitiveTypes = string | number | boolean;
type CharacteristicValue = PrimitiveTypes | PrimitiveTypes[] | { [key: string]: PrimitiveTypes };

interface CharacteristicJsonObject {
    type: string, // uuid or short uuid
    iid: number,
    value?: Nullable<CharacteristicValue>, // undefined for non readable characteristics

    perms: Perms[],
    format: Formats | string,

    description?: string,

    unit?: Units | string,
    minValue?: number,
    maxValue?: number,
    minStep?: number,
    maxLen?: number,
    maxDataLen?: number,
    "valid-values"?: number[],
    "valid-values-range"?: [min: number, max: number],
}

interface ServiceJsonObject {
    type: string,
    iid: number,
    characteristics: CharacteristicJsonObject[], // must not be empty, max 100 characteristics
    hidden?: boolean,
    primary?: boolean,
    linked?: number[], // iid array
}

interface AccessoryJsonObject {
    aid: number,
    services: ServiceJsonObject[], // must not be empty, max 100 services
}

interface AccessoriesResponse {
    accessories: AccessoryJsonObject[],
}
