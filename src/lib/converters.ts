import { CharacteristicJsonObject } from "hap-nodejs/dist/internal-types";
import {
  AliceCapabilityType,
  AliceDeviceCapabilityInfo,
  AliceDeviceCapabilityState,
  AliceDeviceType,
  AliceErrorCode,
} from "../types/alice";
import { HapServiceType, HAP_SERVICE_TYPE_2_ALICE_DEVICE_TYPE } from "../types/hap";
import { ensureValueInInterval, mireds2Kelvin } from "./util/converters";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")("alice2mqtt:lib/converters");

export function hapServiceType2AliceDeviceType(
  serviceType: HapServiceType
): Maybe<AliceDeviceType> {
  const deviceType = HAP_SERVICE_TYPE_2_ALICE_DEVICE_TYPE[serviceType];
  if (!deviceType) {
    debug(`Unknown device type ${serviceType}`);
  }

  if (deviceType === AliceDeviceType.Other) {
    debug(`Unsupported device type ${serviceType}`);
  }

  return deviceType;
}

export function convertAliceValueToHomeBridgeValue(
  request_capability_data: AliceDeviceCapabilityState,
  currentCharacteristic: CharacteristicJsonObject
): [any, { error_code: AliceErrorCode; error_message: string } | null | undefined] {
  switch (request_capability_data.type) {
    case AliceCapabilityType.OnOff:
      return [request_capability_data.state.value ? 1 : 0, null];
    case AliceCapabilityType.Range:
      switch (request_capability_data.state.instance) {
        case "brightness":
        case "volume": {
          let value = request_capability_data.state.value;
          if (request_capability_data.state.relative) {
            // FIXME: type cast
            value = ((currentCharacteristic.value as number) ?? 0) + value;
          }
          return [ensureValueInInterval(value, 0, 100), null];
        }
        case "temperature":
          if (
            request_capability_data.state.value >= 10 ||
            request_capability_data.state.value <= 38
          ) {
            return [request_capability_data.state.value, null];
          }
          break;

        default:
          break;
      }
      break;
    case AliceCapabilityType.Mode:
      if (request_capability_data.state.instance == "thermostat") {
        switch (request_capability_data.state.value) {
          case "auto":
            return [3, null];

          case "cool":
            return [2, null];

          case "heat":
            return [1, null];

          default:
            break;
        }
      }
      break;
    case AliceCapabilityType.ColorSetting:
      switch (request_capability_data.state.instance) {
        case "temperature_k":
          return [mireds2Kelvin(request_capability_data.state.value), null];
        default:
          break;
      }
      break;
    case AliceCapabilityType.Toggle:
      switch (request_capability_data.state.instance) {
        case "mute":
          return [!!request_capability_data.state.value, null];
        default:
          break;
      }
      break;
    default:
      break;
  }

  return [
    undefined,
    {
      error_code: "INVALID_VALUE",
      error_message: "Requested value is not valid for requested capability",
    },
  ];
}

export function convertHomeBridgeValueToAliceValue(
  capability_data: AliceDeviceCapabilityInfo,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  value: any
): Maybe<AliceDeviceCapabilityState> {
  switch (capability_data.type) {
    case AliceCapabilityType.OnOff:
      return {
        type: AliceCapabilityType.OnOff,
        state: {
          instance: "on",
          value: !!value,
        },
      };
    case AliceCapabilityType.Range:
      return {
        type: AliceCapabilityType.Range,
        state: {
          instance: capability_data.parameters.instance,
          value,
        },
      };
    case AliceCapabilityType.ColorSetting:
      return {
        type: AliceCapabilityType.ColorSetting,
        state: {
          instance: "temperature_k",
          value: mireds2Kelvin(value),
        },
      };
    default:
      return;
  }
}
