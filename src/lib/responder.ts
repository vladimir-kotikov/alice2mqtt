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
import { HapCharacteristicType, HapServiceType } from "../types/hap";
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
  deserializeCharacteristic,
  getCapabilityId,
  getDeviceId,
  serializeCharacteristic,
} from "./util/alice";
import { CharacteristicValue, Perms } from "hap-nodejs";
import {
  CharacteristicReadData,
  CharacteristicReadDataValue,
} from "hap-nodejs/dist/internal-types";
import { makeShortUUID } from "./util/hap";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const createDebug = require("debug");
const trace = createDebug("alice2mqtt:trace:lib/responder");
const debug = createDebug("alice2mqtt:lib/responder");

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
type CompactCharacteristicObject = {
  iid: number;
  type: string;
  value?: Nullable<CharacteristicValue>;
};

type AliceDeviceCustomData = {
  availableCharacteristics: string[];
};

// TODO: This is copied from hap-nodejs as it's declared as const enum there and
// hence is not available for member name lookups. Decide what to do with this.
enum HAPStatus {
  SUCCESS = 0,
  INSUFFICIENT_PRIVILEGES = -70401,
  SERVICE_COMMUNICATION_FAILURE = -70402,
  RESOURCE_BUSY = -70403,
  READ_ONLY_CHARACTERISTIC = -70404,
  WRITE_ONLY_CHARACTERISTIC = -70405,
  NOTIFICATION_NOT_SUPPORTED = -70406,
  OUT_OF_RESOURCE = -70407,
  OPERATION_TIMED_OUT = -70408,
  RESOURCE_DOES_NOT_EXIST = -70409,
  INVALID_VALUE_IN_REQUEST = -70410,
  INSUFFICIENT_AUTHORIZATION = -70411,
  NOT_ALLOWED_IN_CURRENT_STATE = -70412,
}

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

    const devices: AliceDeviceState[] = await asyncMap(
      request.devices,
      async ({ id, custom_data }) => {
        const availableCharacteristics = (
          custom_data as AliceDeviceCustomData
        ).availableCharacteristics.map(deserializeCharacteristic);

        const { hapEndpoint } = endpointsAndAccessoriedByDeviceId[id] ?? {};

        if (!hapEndpoint) {
          return {
            id,
            error_code: "DEVICE_UNREACHABLE",
            error_message: "Homebridge Device with such id is not found",
          };
        }

        let characteristicsValues: CharacteristicReadData[] = [];
        try {
          characteristicsValues = await this.client.getCharacteristics(
            hapEndpoint.instance.host,
            hapEndpoint.instance.port,
            availableCharacteristics.map(({ aid, iid }) => aid + "." + iid)
          );
        } catch (error) {
          console.error(error);
        }

        const characteristics = characteristicsValues.reduce<CompactCharacteristicObject[]>(
          (acc, charReadData, idx) => {
            const { aid, iid, status } = charReadData;
            const type = availableCharacteristics[idx].type;
            if (status) {
              const typeStr = enumNameByValue(HapCharacteristicType, type);
              const statusStr = enumNameByValue(HAPStatus, status as unknown as HAPStatus);
              debug(
                `Failed reading characteristic ${aid}.${iid} (${typeStr})) of device ${id}: ${statusStr}`
              );
              return acc;
            }

            const value = (charReadData as CharacteristicReadDataValue).value;
            return [...acc, { iid, value, type }];
          },
          []
        );

        return {
          id,
          ...hapCharacteristics2AliceDeviceState(characteristics),
        };
      }
    );

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

          const [value, errorData] = convertAliceValueToHomeBridgeValue(capability, characteristic);
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

  const isReadableCharacteristic = ({ perms }: CharacteristicJsonObject) =>
    perms.some((perm) => perm === Perms.PAIRED_READ || (perm as Perms) === Perms.READ);

  const isSupportedCharacteristic = (char: CharacteristicJsonObject) =>
    [
      HapCharacteristicType.Brightness,
      HapCharacteristicType.ColorTemperature,
      HapCharacteristicType.Active,
      HapCharacteristicType.On,
      HapCharacteristicType.Volume,
      HapCharacteristicType.Mute,
    ].includes(char.type as HapCharacteristicType);

  const characteristics = collectCharacteristics(accessory);
  const availableCharacteristics = characteristics
    // We're only interested in characteristics we're able to read
    .filter(isReadableCharacteristic)
    .filter(isSupportedCharacteristic)
    .map((char) => serializeCharacteristic(accessory.aid, char));

  return {
    type,
    name: getAccessoryName(accessory, primaryService),
    device_info: getAccessoryInfo(accessory),
    capabilities: characteristics
      .map(getCapabilityInfo)
      .reduce<AliceDeviceCapabilityInfo[]>(omitDuplicateCapabilities, []),
    custom_data: { availableCharacteristics } as AliceDeviceCustomData,
  };
}

function hapCharacteristics2AliceDeviceState(
  characteristics: CompactCharacteristicObject[]
): Omit<AliceDeviceState, "id"> {
  return {
    capabilities: characteristics
      .map(getCapabilityState)
      .reduce<AliceDeviceCapabilityState[]>(omitDuplicateCapabilities, []),
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

function logUnsupportedCharacteristic({ type }: CompactCharacteristicObject) {
  const shortUUID = makeShortUUID(type);
  const charType = `${enumNameByValue(HapCharacteristicType, type)} (${shortUUID})`;
  trace(`Unsupported characteristic ${charType}`);
}
