import { lookupCapabilities } from './messages';
import { AliceDeviceCapabilityInfo } from "../../types/alice";
import { CharacteristicJsonObject } from "../../types/hap-nodejs_internal";


/*
* Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
*/

export class Characteristic {
  aid: string;
  iid: number;
  type: string;
  value: any;
  description?: string;
  capabilities: AliceDeviceCapabilityInfo[];

  constructor(devices: CharacteristicJsonObject, context: { aid: string }) {
    this.aid = context.aid;
    this.iid = devices.iid;
    this.type = devices.type;
    this.value = devices.value;
    this.description = devices.description;
    this.capabilities = lookupCapabilities(devices);
  }
}
