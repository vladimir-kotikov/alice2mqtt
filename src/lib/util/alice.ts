import { Homebridge } from "hap-node-client";
import {
  AliceCapabilityLike,
  AliceCapabilityType,
  AliceDeviceCapabilityState,
} from "../../types/alice";
import { AccessoryJsonObject, CharacteristicJsonObject } from "../../types/hap-nodejs_internal";
import { makeShortUUID, makeLongUUID } from "./hap";

export interface CustomDataItem {
  iid: number;
  type: string;
}

export interface CustomData {
  aid: number;
  cap: Record<string, string>;
}

export function getDeviceId({ deviceID }: Homebridge, { aid }: AccessoryJsonObject): string {
  return `${deviceID}/${aid}`;
}

export function getCapabilityId({ type, state: { instance } }: AliceDeviceCapabilityState): string {
  return `${type}/${instance}`;
}

export function serializeCharacteristic({ iid, type }: CharacteristicJsonObject): string {
  return [iid, makeShortUUID(type)].join(":");
}

export function deserializeCharacteristic(charData: string): CustomDataItem {
  const [iid, type] = charData.split(":");
  return {
    iid: parseInt(iid, 10),
    type: makeLongUUID(type),
  };
}

export function isRelativeCapability(capability: AliceDeviceCapabilityState): boolean {
  return capability.type === AliceCapabilityType.Range && !!capability.state.relative;
}

export function isOnOffCapability({ type }: AliceCapabilityLike): boolean {
  return type === AliceCapabilityType.OnOff;
}
