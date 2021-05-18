import { AliceCapabilityType, AliceDeviceCapabilityInfo, AliceDeviceCapabilityState, AliceDeviceType, AliceModeCapabilityInfo, AliceModeCapabilityState, AliceModeValue } from "../../types/alice";
import { HapCharacteristicType, HapServiceType, HAP_SERVICE_TYPE_2_ALICE_DEVICE_TYPE } from "../../types/hap";
import { CharacteristicJsonObject } from "../../types/hap-nodejs_internal";
import { mireds2Kelvin } from "../util";
import { Characteristic } from "./Characteristic";

var debug = require('debug')('alice2mqtt:messages');


export function lookupCapabilities(char: CharacteristicJsonObject): AliceDeviceCapabilityInfo[] {
  var response: AliceDeviceCapabilityInfo[] = [];

  switch (char.type) {
    case HapCharacteristicType.ConfiguredName:
    case HapCharacteristicType.Name:
    case HapCharacteristicType.Version:
      // We're not interested in these characteristics to be mapped to capabilities
      break;
    case HapCharacteristicType.TargetHeatingCoolingState:
      if (!char["valid-values"]) {
        // allowed modes are not specified, enable all
        response.push({
          type: AliceCapabilityType.OnOff
        });
        response.push({
          type: AliceCapabilityType.Mode,
          parameters: {
            instance: "thermostat",
            modes: [
              {
                "value": "heat"
              },
              {
                "value": "cool"
              },
              {
                "value": "auto"
              }
            ],
            "ordered": false
          }
        } as AliceModeCapabilityInfo);
      } else {
        var modes: { value: AliceModeValue }[] = [];
        for (var i = 0; i < char["valid-values"].length; i++) {
          switch (char["valid-values"][i]) {
            case 0:
              //off
              response.push({
                type: AliceCapabilityType.OnOff
              });
              break;
            case 1:
              modes.push({
                "value": "heat"
              });
              break;
            case 2:
              modes.push({
                "value": "cool"
              });
              break;
            case 3:
              modes.push({
                "value": "auto"
              });
              break;
          }
        }
        if (modes.length) {
          response.push({
            type: AliceCapabilityType.Mode,
            parameters: {
              instance: "thermostat",
              modes,
            }
          });
        }
      }
      break;
    case HapCharacteristicType.TargetTemperature:
      response.push({
        type: AliceCapabilityType.Range,
        "parameters": {
          "instance": "temperature",
          "unit": "unit.temperature.celsius",
          "range": {
            "min": 10,
            "max": 38,
            "precision": 1
          }
        }
      });
      break;
    case HapCharacteristicType.RotationSpeed:
    case HapCharacteristicType.Brightness:
      response.push({
        type: AliceCapabilityType.Range,
        "parameters": {
          "instance": "brightness",
          "unit": "unit.percent",
          "range": {
            "min": 0,
            "max": 100,
            "precision": 1
          }
        }
      });
      break;
    case HapCharacteristicType.ColorTemperature:
      response.push({
        type: AliceCapabilityType.ColorSetting,
        parameters: {
          temperature_k: {
            // using char.max for min range as mireds and kelvins are in reverse-propportional
            // relation - the lesser in mireds - the greater in kelvins
            min: mireds2Kelvin(char.maxValue || 500),
            max: mireds2Kelvin(char.minValue || 140),
          }
        }
      });
      break;
    case HapCharacteristicType.TargetPosition:
      response.push({
        type: AliceCapabilityType.Range,
        "parameters": {
          "instance": "brightness",
          "unit": "unit.percent",
          "range": {
            "min": 0,
            "max": 100,
            "precision": 1
          }
        }
      });
      break;
    case HapCharacteristicType.StatusActive: // Active on a Fan 2 aka Dyson or Valve
    case HapCharacteristicType.TargetDoorState:
    case HapCharacteristicType.On:
      response.push({
        type: AliceCapabilityType.OnOff,
      });
      break;
    default:
      debug(`Unsupported characteristic ${char.type} (${char.description})`)
      break;
  }

  return response;
}

export function lookupDeviceType(serviceType: HapServiceType): Maybe<AliceDeviceType> {
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
): { value: any } | { error_code: string; error_message: string } {
  switch (request_capability_data.type) {
    case AliceCapabilityType.OnOff:
      return {
        value: request_capability_data.state.value ? 1 : 0
      };
    case AliceCapabilityType.Range:
      switch (request_capability_data.state.instance) {
        case 'brightness':
          if ((request_capability_data.state.value >= 0) || (request_capability_data.state.value <= 100)) {
            return {
              value: request_capability_data.state.value
            };
          }
          break;

        case 'temperature':
          if ((request_capability_data.state.value >= 10) || (request_capability_data.state.value <= 38)) {
            return {
              value: request_capability_data.state.value
            };
          }
          break;

        default:
          break;
      }
      break;
    case AliceCapabilityType.Mode:
      if (request_capability_data.state.instance == 'thermostat') {
        switch (request_capability_data.state.value) {
          case "auto":
            return {
              value: 3
            };

          case "cool":
            return {
              value: 2
            };

          case "heat":
            return {
              value: 1
            };

          default:
            break;
        }
      }
      break;
    case AliceCapabilityType.ColorSetting:
      switch (request_capability_data.state.instance) {
        case "temperature_k":
          return { value: mireds2Kelvin(request_capability_data.state.value) };
        default:
          break;
      }
    default:
      break;
  }

  return {
    error_code: "INVALID_VALUE",
    error_message: "Requested value is not valid for requested capability"
  };
}

export function convertHomeBridgeValueToAliceValue(
  capability_data: AliceDeviceCapabilityInfo, characteristic_data: Characteristic
): AliceDeviceCapabilityState | { error_code: string; error_message: string } {
  switch (capability_data.type) {
    case AliceCapabilityType.OnOff:
      return {
        type: AliceCapabilityType.OnOff,
        state: {
          instance: "on",
          value: !!characteristic_data.value,
        }
      };
    case AliceCapabilityType.Range:
      return {
        type: AliceCapabilityType.Range,
        state: {
          instance: capability_data.parameters.instance,
          value: characteristic_data.value,
        }
      };
    case AliceCapabilityType.Mode:
      let capabilityValue: Maybe<AliceModeValue> = undefined;
      switch (characteristic_data.value) {
        case 3:
          capabilityValue = "auto";
          break;
        case 2:
          capabilityValue = "cool";
          break;
        case 1:
          capabilityValue = "heat";
          break;
        case 0:
          // capabilityValue = "off";
          // FIXME: was "off" but there's no such value in alice docs
          capabilityValue = "auto";
          break;
        default:
          break;
      }
      if (!capabilityValue) {
        break;
      }
      return {
        type: AliceCapabilityType.Mode,
        state: {
          instance: capability_data.parameters.instance,
          value: capabilityValue
        }
      };
    case AliceCapabilityType.ColorSetting:
      return {
        type: AliceCapabilityType.ColorSetting,
        state: {
          instance: "temperature_k",
          value: mireds2Kelvin(characteristic_data.value),
        }
      };
    default:
      break;
  }

  return {
    error_code: "INTERNAL_ERROR",
    error_message: "Couldn't convert device capability value for Alice"
  };
}
