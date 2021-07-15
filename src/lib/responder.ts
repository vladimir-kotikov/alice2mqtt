import { HAPNodeJSClientOptions, Homebridge } from "hap-node-client";
import {
  AliceActionRequest,
  AliceActionResponse,
  AliceCapabilityType,
  AliceColorSettingCapabilityState,
  AliceDeviceCapabilityInfo,
  AliceDeviceCapabilityState,
  AliceDeviceMetadata,
  AliceDevicesRequest,
  AliceDevicesResponse,
  AliceDeviceState,
  AliceOnOffCapabilityState,
  AliceQueryRequest,
  AliceQueryResponse,
  AliceRangedCapabilityState,
  AliceToggleCapabilityState,
} from "../types/alice";
import { HapCharacteristicType, HapServiceType, HAPStatus } from "../types/hap";
import {
  AccessoryJsonObject,
  CharacteristicJsonObject,
  ServiceJsonObject,
} from "../types/hap-nodejs_internal";
import { AsyncHapClient } from "./asyncHapClient";
import { convertAliceValueToHomeBridgeValue, hapServiceType2AliceDeviceType } from "./converters";
import { asyncMap, enumNameByValue, getCharacteristic } from "./util/common";
import { mireds2Kelvin } from "./util/converters";
import { capabilityActionResult, errorActionResult } from "./util/actionResult";
import {
  CustomData,
  deserializeCharacteristic,
  getCapabilityId,
  getDeviceId,
  isOnOffCapability,
  isRelativeCapability,
  serializeCharacteristic,
} from "./util/alice";
import { CharacteristicValue } from "hap-nodejs";
import {
  CharacteristicReadData,
  CharacteristicReadDataValue,
} from "hap-nodejs/dist/internal-types";
import { makeShortUUID } from "./util/hap";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const createDebug = require("debug");
const trace = createDebug("alice2mqtt:trace:lib/responder");
const debug = createDebug("alice2mqtt:lib/responder");

type EndpointAndAccessoryByDeviceId = {
  [deviceId: string]: {
    hapEndpoint: Homebridge;
    accessory: AccessoryJsonObject;
  };
};
type CompactCharacteristicObject = {
  type: string;
  value?: Nullable<CharacteristicValue>;
};

export class AliceResponder {
  client: AsyncHapClient;

  constructor(options: HAPNodeJSClientOptions) {
    this.client = new AsyncHapClient(options);
    this.client.accessories();
  }

  devices = async (
    devicesRequest: AliceDevicesRequest
  ): Promise<AliceDevicesResponse<CustomData>> => {
    const hapEndpoints = await this.client.accessories();
    const endpointsAndAccessoriedByDeviceId = collectAccessories(hapEndpoints);
    const devices: AliceDeviceMetadata<CustomData>[] = [];
    Object.entries(endpointsAndAccessoriedByDeviceId).forEach(([id, { accessory }]) => {
      const deviceInfo = hapAccessory2AliceDeviceInfo(accessory);
      if (deviceInfo !== undefined) {
        devices.push({ id, ...deviceInfo });
      }
    });

    return {
      request_id: devicesRequest.request_id,
      payload: {
        user_id: "user",
        devices,
      },
    };
  };

  query = async (request: AliceQueryRequest<CustomData>): Promise<AliceQueryResponse> => {
    const hapEndpoints = await this.client.accessories();
    const endpointsAndAccessoriedByDeviceId = collectAccessories(hapEndpoints);

    const devices: AliceDeviceState[] = await asyncMap(
      request.devices,
      async ({ id, custom_data }) => {
        const { hapEndpoint } = endpointsAndAccessoriedByDeviceId[id] ?? {};
        if (!hapEndpoint) {
          return {
            id,
            error_code: "DEVICE_UNREACHABLE",
            error_message: "Homebridge Device with such id is not found",
          };
        }

        const availableCharacteristics = Object.values(custom_data.cap).map(
          deserializeCharacteristic
        );
        let characteristicsValues: CharacteristicReadData[] = [];
        try {
          characteristicsValues = await this.client.getCharacteristics(
            hapEndpoint.instance.host,
            hapEndpoint.instance.port,
            availableCharacteristics.map(({ iid }) => [custom_data.aid, iid])
          );
        } catch (error) {
          console.error(error);
          // TODO: Report to sentry
          return {
            id,
            error_code: "DEVICE_UNREACHABLE",
            error_message: `Failed communicating with device ${id}`,
          };
        }

        const capabilities: AliceDeviceCapabilityState[] = [];
        characteristicsValues.forEach((charReadData, idx) => {
          const { aid, iid, status } = charReadData;
          const type = availableCharacteristics[idx].type;
          if (status) {
            const typeStr = enumNameByValue(HapCharacteristicType, type);
            const statusStr = enumNameByValue(HAPStatus, status as unknown as HAPStatus);
            debug(
              `Failed reading characteristic ${aid}.${iid} (${typeStr})) of device ${id}: ${statusStr}`
            );
            return;
          }

          const value = (charReadData as CharacteristicReadDataValue).value;
          const capabilityState = getCapabilityState({ value, type });
          if (
            !capabilityState ||
            (isOnOffCapability(capabilityState) && capabilities.find(isOnOffCapability))
          ) {
            return;
          }

          capabilities.push(capabilityState);
        });

        return { id, capabilities };
      }
    );

    return {
      request_id: request.request_id,
      payload: { devices },
    };
  };

  action = async (request: AliceActionRequest<CustomData>): Promise<AliceActionResponse> => {
    const hapEndpoints = await this.client.accessories();
    const endpointsAndAccessoriedByDeviceId = collectAccessories(hapEndpoints);

    const devices = await asyncMap(
      request.payload.devices,
      async ({ id, capabilities: requestCapabilities, custom_data }) => {
        const { hapEndpoint } = endpointsAndAccessoriedByDeviceId[id] ?? {};
        if (!hapEndpoint) {
          return {
            id,
            error_code: "DEVICE_UNREACHABLE",
            error_message: "Homebridge Device with such id is not found",
          };
        }

        const capabilities = await asyncMap(requestCapabilities, async (capability) => {
          const capabilityId = getCapabilityId(capability);
          const serializedCharacteristic = custom_data.cap[capabilityId] ?? {};

          if (serializedCharacteristic === undefined) {
            return capabilityActionResult(
              capability,
              errorActionResult(
                "INVALID_ACTION",
                "Requested capability is not found for requested Homebridge Device"
              )
            );
          }

          const { host, port } = hapEndpoint.instance;
          const { iid } = deserializeCharacteristic(serializedCharacteristic);
          const { aid } = custom_data;
          let currentValue: Maybe<Nullable<CharacteristicValue>> = undefined;
          if (isRelativeCapability(capability)) {
            try {
              currentValue = await this.client.getCharacteristic(host, port, aid, iid);
            } catch (error) {
              debug(`Couldn't read current value for characteristic ${aid}.${iid}: ${error}`);
            }
          }

          const [value, errorData] = convertAliceValueToHomeBridgeValue(capability, currentValue);
          if (errorData) {
            return capabilityActionResult(capability, { status: "ERROR", ...errorData });
          }

          try {
            const hapResponse = await this.client.command(host, port, [{ aid, iid, value }]);
            debug(`HAP Endpoint ${hapEndpoint.deviceID} -> ${hapResponse}`);

            debug(`Set ${id}:${getCapabilityId(capability)} -> ${value} OK`);
            return capabilityActionResult(capability, { status: "DONE" });
          } catch (err) {
            return capabilityActionResult(
              capability,
              errorActionResult("INTERNAL_ERROR", err.message)
            );
          }
        });

        return { id, capabilities };
      }
    );

    return {
      request_id: request.request_id,
      payload: { devices },
    };
  };
}

function hapAccessory2AliceDeviceInfo(
  accessory: AccessoryJsonObject
): Maybe<Omit<AliceDeviceMetadata<CustomData>, "id">> {
  const primaryService = getPrimaryService(accessory);
  if (!primaryService) {
    debug(`Can't identify primary service for accessory ${accessory.aid}`);
    return;
  }

  const type = hapServiceType2AliceDeviceType(primaryService.type as HapServiceType);
  if (!type) {
    debug(`Unsupported device type ${primaryService.type} for accessory ${accessory.aid}`);
    return;
  }

  const capabilities: AliceDeviceCapabilityInfo[] = [];
  const custom_data: Omit<CustomData, "hid"> = { aid: accessory.aid, cap: {} };
  collectCharacteristics(accessory).forEach((characteristic) => {
    const capabilityInfo = getCapabilityInfo(characteristic);
    if (
      !capabilityInfo ||
      (isOnOffCapability(capabilityInfo) && capabilities.find(isOnOffCapability))
    ) {
      return;
    }

    capabilities.push(capabilityInfo);

    const capabilityState = getCapabilityState(characteristic);
    // FIXME: capabilityState is always defined here
    const capabilityId = getCapabilityId(capabilityState!);
    custom_data.cap[capabilityId] = serializeCharacteristic(characteristic);
  });

  return {
    type,
    name: getAccessoryName(accessory, primaryService),
    device_info: getAccessoryInfo(accessory),
    capabilities,
    custom_data,
  };
}

function getServiceName(service: ServiceJsonObject, inferNameFromType = true): Maybe<string> {
  const name =
    getCharacteristic<string>(service, HapCharacteristicType.ConfiguredName) ||
    getCharacteristic<string>(service, HapCharacteristicType.Name);

  if (name !== undefined) {
    return name;
  }

  if (inferNameFromType) {
    return enumNameByValue(HapServiceType, service.type);
  }

  return;
}

function getAccessoryName(
  accessory: AccessoryJsonObject,
  primaryService: ServiceJsonObject
): string {
  const accessoryInfo = accessory.services.find(
    (serviceJson) => serviceJson.type === HapServiceType.AccessoryInformation
  );

  return (
    (accessoryInfo && getServiceName(accessoryInfo, false)) ||
    (primaryService && getServiceName(primaryService)) ||
    "Unknown accessory"
  );
}

function getAccessoryInfo(accessory: AccessoryJsonObject) {
  const accessoryInfo = accessory.services.find(
    (serviceJson) => serviceJson.type === HapServiceType.AccessoryInformation
  );

  return {
    manufacturer: getCharacteristic<string>(accessoryInfo, HapCharacteristicType.Manufacturer),
    model: getCharacteristic<string>(accessoryInfo, HapCharacteristicType.Model),
    hw_version: getCharacteristic<string>(accessoryInfo, HapCharacteristicType.HardwareRevision),
    sw_version:
      getCharacteristic<string>(accessoryInfo, HapCharacteristicType.SoftwareRevision) ||
      getCharacteristic(accessoryInfo, HapCharacteristicType.FirmwareRevision),
  };
}

function getPrimaryService(accessory: AccessoryJsonObject): Maybe<ServiceJsonObject> {
  const validServices = accessory.services.filter(
    (service) =>
      service.type !== HapServiceType.AccessoryInformation &&
      service.type !== HapServiceType.ProtocolInformation
  );

  if (validServices.length === 0) {
    debug(`Can't determine primary service for accessory ${accessory.aid}. No services found.`);
    return;
  }

  let primaryService =
    validServices.find((service) => service.primary) ??
    validServices.find((service) => !!service.linked);

  if (!primaryService) {
    debug(
      `Primary service - fall back to first available service as primary for accessory ${accessory.aid}.`
    );
    primaryService = validServices[0];
  }

  return primaryService;
}

/**
 * Given a list of homebridge endpoints (as returned by hap-nodejs-client's `HAPaccessories` method)
 * collects all accessories into a dictionary of {endpoint, accessory} records keyed by Alice device id.
 *
 * @param hapEndpoints List of Homebridge endpoints as returned by hap-nodejs-client's `HAPaccessories` method
 * @returns dictionary of {endpoint, accessory} records keyed by Alice device id.
 */
function collectAccessories(hapEndpoints: Homebridge[]): EndpointAndAccessoryByDeviceId {
  const result: EndpointAndAccessoryByDeviceId = {};
  hapEndpoints.forEach((hapEndpoint) => {
    hapEndpoint.accessories.accessories.forEach((accessory) => {
      const deviceId = getDeviceId(hapEndpoint, accessory);
      result[deviceId] = { hapEndpoint, accessory };
    });
  });

  return result;
}

function collectCharacteristics(accessory: AccessoryJsonObject): CharacteristicJsonObject[] {
  const isActionableService = (service: ServiceJsonObject) =>
    service.type !== HapServiceType.AccessoryInformation &&
    service.type !== HapServiceType.ProtocolInformation;

  return accessory.services
    .filter(isActionableService)
    .reduce<CharacteristicJsonObject[]>(
      (characteristics, service) => [...characteristics, ...service.characteristics],
      []
    );
}

function getCapabilityInfo(char: CharacteristicJsonObject): Maybe<AliceDeviceCapabilityInfo> {
  switch (char.type) {
    case HapCharacteristicType.ConfiguredName:
    case HapCharacteristicType.Name:
    case HapCharacteristicType.Version:
      // We're not interested in these characteristics to be mapped to capabilities
      return;
    case HapCharacteristicType.Brightness:
      return {
        type: AliceCapabilityType.Range,
        parameters: {
          instance: "brightness",
          unit: "unit.percent",
          range: {
            min: 0,
            max: 100,
          },
        },
      };
    case HapCharacteristicType.ColorTemperature:
      return {
        type: AliceCapabilityType.ColorSetting,
        parameters: {
          temperature_k: {
            // using char.max for min range as mireds and kelvins are in reverse-propportional
            // relation - the lesser in mireds - the greater in kelvins
            min: mireds2Kelvin(char.maxValue || 500),
            max: mireds2Kelvin(char.minValue || 140),
          },
        },
      };
    case HapCharacteristicType.Active:
    case HapCharacteristicType.On:
      return { type: AliceCapabilityType.OnOff };
    case HapCharacteristicType.Volume:
      return {
        type: AliceCapabilityType.Range,
        parameters: { instance: "volume" },
      };
    case HapCharacteristicType.Mute:
      return {
        type: AliceCapabilityType.Toggle,
        parameters: { instance: "mute" },
      };
    default:
      logUnsupportedCharacteristic(char);
      return;
  }
}

function getCapabilityState(char: CompactCharacteristicObject): Maybe<AliceDeviceCapabilityState> {
  switch (char.type) {
    case HapCharacteristicType.ConfiguredName:
    case HapCharacteristicType.Name:
    case HapCharacteristicType.Version:
      // We're not interested in these characteristics to be mapped to capabilities
      return;
    case HapCharacteristicType.Brightness:
      return {
        type: AliceCapabilityType.Range,
        state: {
          instance: "brightness",
          value: char.value,
        },
      } as AliceRangedCapabilityState;
    case HapCharacteristicType.ColorTemperature:
      return {
        type: AliceCapabilityType.ColorSetting,
        state: {
          instance: "temperature_k",
          value: mireds2Kelvin(char.value as number),
        },
      } as AliceColorSettingCapabilityState;
    case HapCharacteristicType.Active:
    case HapCharacteristicType.On:
      return {
        type: AliceCapabilityType.OnOff,
        state: {
          instance: "on",
          value: !!char.value,
        },
      } as AliceOnOffCapabilityState;
    case HapCharacteristicType.Volume:
      return {
        type: AliceCapabilityType.Range,
        state: {
          instance: "volume",
          value: char.value,
        },
      } as AliceRangedCapabilityState;
    case HapCharacteristicType.Mute:
      return {
        type: AliceCapabilityType.Toggle,
        state: {
          instance: "mute",
          value: !!char.value,
        },
      } as AliceToggleCapabilityState;
    default:
      logUnsupportedCharacteristic(char);
      return;
  }
}

function logUnsupportedCharacteristic({ type }: CompactCharacteristicObject) {
  const shortUUID = makeShortUUID(type);
  const charType = `${enumNameByValue(HapCharacteristicType, type)} (${shortUUID})`;
  trace(`Unsupported characteristic ${charType}`);
}
