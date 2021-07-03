import { Homebridge } from "hap-node-client";
import { AliceDeviceCapabilityState } from "../../types/alice";
import { AccessoryJsonObject, CharacteristicJsonObject } from "../../types/hap-nodejs_internal";
import { makeShortUUID, makeLongUUID } from "./hap";

interface AliceDeviceCustomDataItem {
  aid: number;
  iid: number;
  type: string;
}

export function getDeviceId({ deviceID }: Homebridge, { aid }: AccessoryJsonObject): string {
  return `${deviceID}/${aid}`;
}

export function getCapabilityId({ type, state: { instance } }: AliceDeviceCapabilityState): string {
  return `${type}/${instance}`;
}

export function serializeCharacteristic(
  accessoryId: Number,
  { iid, type }: CharacteristicJsonObject
): string {
  return [accessoryId, iid, makeShortUUID(type)].join(":");
}

export function deserializeCharacteristic(charData: string): AliceDeviceCustomDataItem {
  const [aid, iid, type] = charData.split(":");
  return {
    aid: parseInt(aid, 10),
    iid: parseInt(iid, 10),
    type: makeLongUUID(type),
  };
}
