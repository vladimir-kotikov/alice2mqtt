import { Homebridge } from "hap-node-client";
import { AliceDeviceCapabilityState } from "../../types/alice";
import { AccessoryJsonObject } from "../../types/hap-nodejs_internal";

export function getDeviceId({ deviceID }: Homebridge, { aid }: AccessoryJsonObject): string {
  return `${deviceID}/${aid}`;
}

export function getCapabilityId({ type, state: { instance } }: AliceDeviceCapabilityState): string {
  return `${type}/${instance}`;
}
