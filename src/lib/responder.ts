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
} from "../types/alice";
import { HapCharacteristicType, HapServiceType } from "../types/hap";
import {
  AccessoryJsonObject,
  CharacteristicJsonObject,
  ServiceJsonObject,
} from "../types/hap-nodejs_internal";
import { AsyncHapClient } from "./asyncHapClient";
import { convertAliceValueToHomeBridgeValue, hapServiceType2AliceDeviceType } from "./converters";
import { asyncMap, enumNameByValue, getCharacteristic, mireds2Kelvin } from "./util/common";
import { capabilityActionResult, errorActionResult } from "./util/actionResult";
import { getCapabilityId, getDeviceId } from "./util/alice";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")("alice2mqtt:aliceActions");

type AliceCapabilityLike = { type: AliceCapabilityType };
type EndpointAndAccessoryByDeviceId = {
  [deviceId: string]: {
    hapEndpoint: Homebridge;
    accessory: AccessoryJsonObject;
  };
};
type CharacteristicAndCapabilityByCapabilityId = {
  [capabilityId: string]: {
    characteristic: CharacteristicJsonObject;
    capability: AliceDeviceCapabilityState;
  };
};

export class AliceResponder {
  client: AsyncHapClient;

  constructor(options: HAPNodeJSClientOptions) {
    this.client = new AsyncHapClient(options);
    this.client.accessories();
  }

  devices = async (devicesRequest: AliceDevicesRequest): Promise<AliceDevicesResponse> => {
    const hapEndpoints = await this.client.accessories();
    const endpointsAndAccessoriedByDeviceId = collectAccessories(hapEndpoints);
    const devices = Object.entries(endpointsAndAccessoriedByDeviceId).reduce<AliceDeviceMetadata[]>(
      (devices, [id, { accessory }]) => {
        const deviceInfo = hapAccessory2AliceDeviceInfo(accessory);
        return deviceInfo ? [...devices, { id, ...deviceInfo }] : devices;
      },
      []
    );

    return {
      request_id: devicesRequest.request_id,
      payload: {
        user_id: "user",
        devices,
      },
    };
  };

  query = async (request: AliceQueryRequest): Promise<AliceQueryResponse> => {
    const hapEndpoints = await this.client.accessories();
    const endpointsAndAccessoriedByDeviceId = collectAccessories(hapEndpoints);
    const devices = request.devices.map(({ id }) => {
      const { accessory } = endpointsAndAccessoriedByDeviceId[id] ?? {};
      // TODO: if (!accessory) respond with 404 in this case
      return { id, ...hapAccessory2AliceDeviceState(accessory) };
    });

    return {
      request_id: request.request_id,
      payload: { devices },
    };
  };

  action = async (request: AliceActionRequest): Promise<AliceActionResponse> => {
    const hapEndpoints = await this.client.accessories();
    const endpointsAndAccessoriedByDeviceId = collectAccessories(hapEndpoints);

    const devices = await asyncMap(
      request.payload.devices,
      async ({ id, capabilities: requestCapabilities }) => {
        const { hapEndpoint, accessory } = endpointsAndAccessoriedByDeviceId[id] ?? {};
        // TODO: if (!accessory) respond with 404 in this case
        if (!accessory) {
          const action_result = errorActionResult(
            "DEVICE_UNREACHABLE",
            "Homebridge Device with such id is not found"
          );
          return { id, action_result };
        }

        const allCapabilities = collectCharacteristicsAndCapabilities(accessory);
        const capabilities = await asyncMap(requestCapabilities, async (capability) => {
          const capabilityId = getCapabilityId(capability);
          const { characteristic } = allCapabilities[capabilityId] ?? {};
          if (allCapabilities[capabilityId] === undefined) {
            return capabilityActionResult(
              capability,
              errorActionResult(
                "INVALID_ACTION",
                "Requested capability is not found for requested Homebridge Device"
              )
            );
          }

          const [value, errorData] = convertAliceValueToHomeBridgeValue(capability);
          if (errorData) {
            return capabilityActionResult(capability, { status: "ERROR", ...errorData });
          }

          try {
            const hapResponse = await this.client.command(
              hapEndpoint.instance.host,
              hapEndpoint.instance.port,
              [{ aid: accessory.aid, iid: characteristic.iid, value }]
            );
            debug(`HAP Endpoint ${hapEndpoint.deviceID} -> ${hapResponse}`);

            console.log(`Set ${id}:${getCapabilityId(capability)} -> ${value} OK`);
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
): Maybe<Omit<AliceDeviceMetadata, "id">> {
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

  return {
    type,
    name: getAccessoryName(accessory, primaryService),
    device_info: getAccessoryInfo(accessory),
    capabilities: collectCharacteristics(accessory)
      .map(getCapabilityInfo)
      .reduce<AliceDeviceCapabilityInfo[]>(omitDuplicateCapabilities, []),
  };
}

function hapAccessory2AliceDeviceState(
  accessory?: AccessoryJsonObject
): Omit<AliceDeviceState, "id"> {
  return accessory
    ? {
        capabilities: collectCharacteristics(accessory)
          .map(getCapabilityState)
          .reduce<AliceDeviceCapabilityState[]>(omitDuplicateCapabilities, []),
      }
    : {
        error_code: "DEVICE_UNREACHABLE",
        error_message: "Homebridge Device with such id is not found",
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

function collectCharacteristicsAndCapabilities(
  accessory: AccessoryJsonObject
): CharacteristicAndCapabilityByCapabilityId {
  return collectCharacteristics(accessory).reduce<CharacteristicAndCapabilityByCapabilityId>(
    (characteristicsAndCapabilities, characteristic) => {
      const capability = getCapabilityState(characteristic);
      if (capability) {
        const capabilityId = getCapabilityId(capability);
        if (!(capabilityId in characteristicsAndCapabilities)) {
          characteristicsAndCapabilities[capabilityId] = { characteristic, capability };
        }
      }

      return characteristicsAndCapabilities;
    },
    {}
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
    case HapCharacteristicType.On:
      return { type: AliceCapabilityType.OnOff };
    default:
      debug(`Unsupported characteristic ${char.type} (${char.description})`);
      return;
  }
}

function getCapabilityState(char: CharacteristicJsonObject): Maybe<AliceDeviceCapabilityState> {
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
    case HapCharacteristicType.On:
      return {
        type: AliceCapabilityType.OnOff,
        state: {
          instance: "on",
          value: !!char.value,
        },
      } as AliceOnOffCapabilityState;
    default:
      debug(`Unsupported characteristic ${char.type} (${char.description})`);
      return;
  }
}

function omitDuplicateCapabilities<T extends AliceCapabilityLike>(
  result: T[],
  capability: Maybe<T>
) {
  const isOnOffCapability = ({ type }: AliceCapabilityLike) => type === AliceCapabilityType.OnOff;

  if (!capability || (isOnOffCapability(capability) && result.find(isOnOffCapability))) {
    return result;
  }

  return [...result, capability];
}
